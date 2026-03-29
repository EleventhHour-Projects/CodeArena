package worker

import (
	"bytes"
	"context"
	"executor-service/utils"
	"fmt"
	"strings"
	"time"

	"github.com/moby/moby/api/pkg/stdcopy"
	"github.com/moby/moby/api/types/container"
	"github.com/moby/moby/client"
)

func execCommand(ctx context.Context, cli *client.Client, containerID string, cmd []string, input string) (string, string, error) {

	execResp, err := cli.ExecCreate(ctx, containerID, client.ExecCreateOptions{
		Cmd:          cmd,
		AttachStdout: true,
		AttachStderr: true,
		AttachStdin:  true,
	})
	if err != nil {
		return "", "", err
	}

	attachResp, err := cli.ExecAttach(ctx, execResp.ID, client.ExecAttachOptions{})
	if err != nil {
		return "", "", err
	}
	defer attachResp.Close()

	if input != "" {
		attachResp.Conn.Write([]byte(input))
		attachResp.CloseWrite()
	}

	var stdout, stderr bytes.Buffer

	_, err = stdcopy.StdCopy(&stdout, &stderr, attachResp.Reader)
	if err != nil {
		return "", "", err
	}

	return stdout.String(), stderr.String(), nil
}

func normalizeOutput(s string) string {
	lines := strings.Split(s, "\n")
	var cleanLines []string
	for _, line := range lines {
		cleanLines = append(cleanLines, strings.TrimRight(line, " \t\r"))
	}
	return strings.TrimSpace(strings.Join(cleanLines, "\n"))
}

func RunTask(ctx context.Context, cli *client.Client, containerID string, task *utils.CodeConfig) error {
	var failedInfo FailedInfo

	writeCmd := []string{"sh", "-c", "cat > /tmp/main.cpp"}

	_, _, err := execCommand(ctx, cli, containerID, writeCmd, task.Code)
	if err != nil {
		return err
	}

	compileCmd := []string{"g++", "/tmp/main.cpp", "-o", "/tmp/a.out"}

	_, compErr, err := execCommand(ctx, cli, containerID, compileCmd, "")
	if err != nil {
		return err
	}

	// Check for compilation errors
	if strings.Contains(compErr, "error:") {
		failedInfo = FailedInfo{
			isFailed:     true,
			ErrorMessage: "Compilation Error",
			ActualOutput: compErr,
		}
		SaveSubmissionResult(task, 0, 0, &failedInfo)
		return nil
	}

	var totalTime time.Duration

	for input, expected := range task.TestCases {

		ectx, cancel := context.WithTimeout(ctx, time.Second*2) // Relax timeout slightly for overhead

		runCmd := []string{"timeout", "1s", "/tmp/a.out"}

		start := time.Now()

		output, runStderr, err := execCommand(ectx, cli, containerID, runCmd, input+"\n")

		elapsed := time.Since(start)
		totalTime += elapsed

		cancel()

		// timeout handling (infinite loop protection)
		if ectx.Err() == context.DeadlineExceeded {

			fmt.Println("Testcase timeout:", input)

			// kill container to stop infinite loop
			cli.ContainerKill(context.Background(), containerID, client.ContainerKillOptions{Signal: "SIGKILL"})

			failedInfo = FailedInfo{
				isFailed:     true,
				ErrorMessage: "Time Limit Exceeded (>1s)",
				TestCase:     input,
			}

			break
		}

		if err != nil {
			return err
		}

		actual := normalizeOutput(output)
		exp := normalizeOutput(fmt.Sprint(expected))

		if exp == "true" || exp == "false" {
			if actual == "0" {
				actual = "false"
			} else if actual == "1" {
				actual = "true"
			}
		}

		if actual != exp {
			errorMsg := "Wrong Answer"
			if actual == "" && runStderr != "" {
				errorMsg = "Runtime Error / Segfault"
				actual = runStderr
			}

			failedInfo = FailedInfo{
				isFailed:       true,
				ErrorMessage:   errorMsg,
				TestCase:       input,
				ActualOutput:   actual,
				ExpectedOutput: exp,
			}
			break
		}

		// fmt.Println("Testcase passed",
		// 	"Input:", input,
		// 	"Output:", actual,
		// 	"Expected:", exp,
		// 	"Time:", elapsed)
	}

	// fmt.Println("Total Execution Time:", totalTime)

	if !failedInfo.isFailed {
		failedInfo = FailedInfo{
			isFailed: false,
		}
	}

	memory := 0
	SaveSubmissionResult(task, totalTime, memory, &failedInfo)
	utils.TaskInfo.IncrementTime(totalTime)
	return nil
}

func worker(ctx context.Context) {
	utils.WorkerPoolData.Increment()
	containerName := fmt.Sprintf("code-executor-worker-%d-%v", time.Now().UnixNano(), utils.RandomString(6))
	apiClient, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		fmt.Println(utils.Red+"Docker client error:"+utils.Reset, err)
		return
	}
	defer apiClient.Close()
	PidL := int64(64)
	t := true
	imageName := "gcc:13"
	resp, err := apiClient.ContainerCreate(ctx, client.ContainerCreateOptions{
		Image: imageName,
		Name:  containerName,
		HostConfig: &container.HostConfig{
			Init: &t,
			Resources: container.Resources{
				Memory:    256 * 1024 * 1024,
				NanoCPUs:  1e9,
				PidsLimit: &PidL,
			},
			NetworkMode:    "none",
			ReadonlyRootfs: true,
			Tmpfs: map[string]string{
				"/tmp": "rw,exec,nosuid,size=64m",
			},
		},
		Config: &container.Config{Cmd: []string{"tail", "-f", "/dev/null"}},
	})
	if err != nil {
		fmt.Println(utils.Red+"Error creating container L129 :"+utils.Reset, err)
		return
	}
	fmt.Println(utils.Green+"Worker started - Active Workers:"+utils.Reset, utils.WorkerPoolData.GetCount(), utils.Green+"Container ID:"+utils.Reset, containerName)
	if _, err := apiClient.ContainerStart(ctx, resp.ID, client.ContainerStartOptions{}); err != nil {
		utils.WorkerPoolData.Decrement()
		KillContainerByID(ctx, containerName)
		SpawnWorkerFailed(ctx)
		return
		//panic(err)
	}
	for {
		task := utils.WorkerPoolData.GetTask()
		if task.StopSignal != nil && *task.StopSignal {
			fmt.Println(utils.Yellow+"Worker received stop signal, shutting down container:"+utils.Reset, containerName)
			KillContainerByID(ctx, containerName)
			utils.WorkerPoolData.Decrement()
			return
		}
		fmt.Println("Worker received task:", task.TaskID)
		eventType := utils.EVENTTYPERUN
		if task.Type == "Submit" {
			eventType = utils.EVENTTYPESUBMIT
		}
		utils.WSServer.Add(utils.WSSPayload{
			UserID:       task.UserID,
			BattleID:     task.BattleID,
			SubmissionID: nil,
			Event:        utils.EVENTTYPE(eventType),
		})

		// 10 seconds is more reasonable for compilation + multiple test cases
		runCtx, cancel := context.WithTimeout(ctx, 10*time.Second)

		err := RunTask(runCtx, apiClient, resp.ID, &task)
		if err != nil {
			fmt.Println(utils.Red+"Worker failed task:"+utils.Reset, task.TaskID, "Error:", err, "Spawning new worker")
			KillContainerByID(ctx, containerName)
			utils.WorkerPoolData.Decrement()
			SpawnWorkerFailed(ctx)
			utils.WorkerPoolData.AddTask(task)
			cancel() // cancel context before breaking
			break
		} else {
			fmt.Println("Worker completed task:", task.TaskID, "by worker:", containerName)
		}
		cancel() // Manual cancel to avoid defer leak in loop
	}
}
