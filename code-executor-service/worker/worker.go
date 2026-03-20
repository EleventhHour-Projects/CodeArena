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

func execCommand(ctx context.Context, cli *client.Client, containerID string, cmd []string, input string) (string, error) {

	execResp, err := cli.ExecCreate(ctx, containerID, client.ExecCreateOptions{
		Cmd:          cmd,
		AttachStdout: true,
		AttachStderr: true,
		AttachStdin:  true,
	})
	if err != nil {
		return "", err
	}

	attachResp, err := cli.ExecAttach(ctx, execResp.ID, client.ExecAttachOptions{})
	if err != nil {
		return "", err
	}
	defer attachResp.Close()

	if input != "" {
		attachResp.Conn.Write([]byte(input))
		attachResp.CloseWrite()
	}

	var stdout, stderr bytes.Buffer

	_, err = stdcopy.StdCopy(&stdout, &stderr, attachResp.Reader)
	if err != nil {
		return "", err
	}

	return stdout.String(), nil
}

func RunTask(ctx context.Context, cli *client.Client, containerID string, task *utils.CodeConfig) error {

	writeCmd := []string{"sh", "-c", "cat > /tmp/main.cpp"}

	_, err := execCommand(ctx, cli, containerID, writeCmd, task.Code)
	if err != nil {
		return err
	}

	compileCmd := []string{"g++", "/tmp/main.cpp", "-o", "/tmp/a.out"}

	_, err = execCommand(ctx, cli, containerID, compileCmd, "")
	if err != nil {
		return err
	}

	var totalTime time.Duration
	var failedInfo FailedInfo

	for input, expected := range task.TestCases {

		ectx, cancel := context.WithTimeout(ctx, time.Second)

		runCmd := []string{"timeout", "1s", "/tmp/a.out"}

		start := time.Now()

		output, err := execCommand(ectx, cli, containerID, runCmd, input+"\n")

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

		actual := strings.TrimSpace(output)
		exp := strings.TrimSpace(fmt.Sprint(expected))

		if actual != exp {
			failedInfo = FailedInfo{
				isFailed:     true,
				ErrorMessage: "Wrong Answer",
				TestCase:     input,
				ActualOutput: actual,
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
		fmt.Println("Worker received task:", task.TaskID)
		runCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		err := RunTask(runCtx, apiClient, resp.ID, &task)
		if err != nil {
			fmt.Println(utils.Red+"Worker failed task:"+utils.Reset, task.TaskID, "Error:", err, "Spawning new worker")
			KillContainerByID(ctx, containerName)
			utils.WorkerPoolData.Decrement()
			SpawnWorkerFailed(ctx)
			utils.WorkerPoolData.AddTask(task)
			break
		} else {
			fmt.Println("Worker completed task:", task.TaskID, "by worker:", containerName)
		}
	}
}
