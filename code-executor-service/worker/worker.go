package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"executor-service/utils"
	"fmt"
	"strings"
	"time"

	"github.com/moby/moby/api/pkg/stdcopy"
	"github.com/moby/moby/api/types/container"
	"github.com/moby/moby/client"
)

// LanguageRuntime describes how a source file should be written, built, and executed inside the worker container.
type LanguageRuntime struct {
	SourceFile string
	CompileCmd []string
	RunCmd     []string
}

// RuntimeForLanguage resolves the execution plan for a supported language.
func RuntimeForLanguage(language string) (LanguageRuntime, bool) {
	switch strings.ToLower(strings.TrimSpace(language)) {
	case "c", "gcc":
		return LanguageRuntime{
			SourceFile: "/tmp/main.c",
			CompileCmd: []string{"gcc", "-O2", "/tmp/main.c", "-o", "/tmp/main"},
			RunCmd:     []string{"timeout", "1s", "/tmp/main"},
		}, true
	case "cpp", "c++", "cc", "cxx":
		return LanguageRuntime{
			SourceFile: "/tmp/main.cpp",
			CompileCmd: []string{"g++", "-O2", "/tmp/main.cpp", "-o", "/tmp/main"},
			RunCmd:     []string{"timeout", "1s", "/tmp/main"},
		}, true
	case "python", "py":
		return LanguageRuntime{
			SourceFile: "/tmp/main.py",
			RunCmd:     []string{"timeout", "1s", "python3", "/tmp/main.py"},
		}, true
	case "java":
		return LanguageRuntime{
			SourceFile: "/tmp/Main.java",
			CompileCmd: []string{"javac", "/tmp/Main.java"},
			RunCmd:     []string{"timeout", "1s", "java", "-cp", "/tmp", "Main"},
		}, true
	case "go", "golang":
		return LanguageRuntime{
			SourceFile: "/tmp/main.go",
			CompileCmd: []string{"go", "build", "-o", "/tmp/main", "/tmp/main.go"},
			RunCmd:     []string{"timeout", "1s", "/tmp/main"},
		}, true
	default:
		return LanguageRuntime{}, false
	}
}

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

type runnerTestCase struct {
	Input    string `json:"input"`
	Expected string `json:"expected"`
	Hidden   bool   `json:"hidden"`
}

type runnerPayload struct {
	Cmd       []string         `json:"cmd"`
	TimeoutMs int              `json:"timeout_ms"`
	TestCases []runnerTestCase `json:"testcases"`
}

type runnerResult struct {
	Passed      bool   `json:"passed"`
	PassedCount int    `json:"passed_count"`
	TotalCount  int    `json:"total_count"`
	TotalTimeMs int    `json:"total_time_ms"`
	Error       string `json:"error"`
	TestCase    string `json:"testcase"`
	Actual      string `json:"actual"`
	Expected    string `json:"expected"`
	IsHidden    bool   `json:"is_hidden"`
	RunnerError string `json:"runner_error"`
}

const inContainerJudgeScript = `import sys, json, subprocess, time

def norm(s):
    lines = s.split('\n')
    clean = [l.rstrip(' \t\r') for l in lines]
    return '\n'.join(clean).strip()

try:
    data = json.load(sys.stdin)
    cmd = data["cmd"]
    timeout_sec = data.get("timeout_ms", 1000) / 1000.0
    testcases = data["testcases"]

    total_ns = 0
    passed_count = 0
    total_count = len(testcases)
    res = {"passed": True, "passed_count": 0, "total_count": total_count, "total_time_ms": 0, "error": "", "testcase": "", "actual": "", "expected": "", "is_hidden": False}

    for tc in testcases:
        tc_in = tc["input"] + "\n"
        exp = norm(tc.get("expected", ""))
        is_hidden = tc.get("hidden", False)
        
        start = time.perf_counter_ns()
        try:
            p = subprocess.run(cmd, input=tc_in, text=True, capture_output=True, timeout=timeout_sec)
            elapsed = time.perf_counter_ns() - start
            total_ns += elapsed
            
            actual = norm(p.stdout)
            err = p.stderr
            
            if exp in ("true", "false"):
                if actual == "0" or actual == "False":
                    actual = "false"
                elif actual == "1" or actual == "True":
                    actual = "true"
            
            if p.returncode != 0 and actual == "" and err != "":
                res["passed"] = False
                res["error"] = "Runtime Error / Segfault"
                res["is_hidden"] = is_hidden
                if not is_hidden:
                    res["testcase"] = tc["input"]
                    res["actual"] = err
                    res["expected"] = exp
                else:
                    res["testcase"] = "[Hidden Test Case]"
                    res["actual"] = ""
                    res["expected"] = ""
                break

            if actual != exp:
                err_msg = "Wrong Answer"
                if actual == "" and err != "":
                    err_msg = "Runtime Error / Segfault"
                    actual = err
                res["passed"] = False
                res["error"] = err_msg
                res["is_hidden"] = is_hidden
                if not is_hidden:
                    res["testcase"] = tc["input"]
                    res["actual"] = actual
                    res["expected"] = exp
                else:
                    res["testcase"] = "[Hidden Test Case]"
                    res["actual"] = ""
                    res["expected"] = ""
                break
            else:
                passed_count += 1
                if not is_hidden:
                    res["actual"] = actual

        except subprocess.TimeoutExpired:
            elapsed = time.perf_counter_ns() - start
            total_ns += elapsed
            res["passed"] = False
            res["error"] = "Time Limit Exceeded (>1s)"
            res["is_hidden"] = is_hidden
            if not is_hidden:
                res["testcase"] = tc["input"]
            else:
                res["testcase"] = "[Hidden Test Case]"
            break
        except Exception as e:
            res["passed"] = False
            res["error"] = "Runtime Error / Segfault"
            res["is_hidden"] = is_hidden
            if not is_hidden:
                res["testcase"] = tc["input"]
                res["actual"] = str(e)
            else:
                res["testcase"] = "[Hidden Test Case]"
                res["actual"] = ""
            break

    res["passed_count"] = passed_count
    res["total_count"] = total_count
    res["total_time_ms"] = int(total_ns / 1000000)
    print(json.dumps(res))
except Exception as e:
    print(json.dumps({"runner_error": str(e)}))
`

func RunTask(ctx context.Context, cli *client.Client, containerID string, task *utils.CodeConfig) error {
	var failedInfo FailedInfo
	runtime, ok := RuntimeForLanguage(task.Language)
	if !ok {
		return fmt.Errorf("unsupported language %q", task.Language)
	}

	// 1. Combined cleanup and source file write in a single Docker exec roundtrip
	writeCmd := []string{"sh", "-c", fmt.Sprintf("rm -f /tmp/main.c /tmp/main.cpp /tmp/Main.java /tmp/main.py /tmp/main.go /tmp/main /tmp/*.class /tmp/a.out && cat > %s", runtime.SourceFile)}
	_, _, err := execCommand(ctx, cli, containerID, writeCmd, task.Code)
	if err != nil {
		return err
	}

	// 2. Compile if required
	if len(runtime.CompileCmd) > 0 {
		_, compErr, err := execCommand(ctx, cli, containerID, runtime.CompileCmd, "")
		if err != nil {
			return err
		}

		// Check for compilation errors
		if strings.Contains(compErr, "error:") || strings.Contains(compErr, "Error:") || strings.Contains(compErr, "undefined reference") {
			failedInfo = FailedInfo{
				isFailed:     true,
				ErrorMessage: "Compilation Error",
				ActualOutput: compErr,
			}
			SaveSubmissionResult(task, 0, 0, &failedInfo)
			return nil
		}
	}

	// 3. Fast Single-Exec Judge Runner
	cleanCmd := runtime.RunCmd
	if len(cleanCmd) >= 3 && cleanCmd[0] == "timeout" {
		cleanCmd = cleanCmd[2:]
	}

	timeoutMs := 1000
	if task.Constraints != nil && task.Constraints.MaxTime > 0 {
		timeoutMs = task.Constraints.MaxTime
	}

	var testCasesList []runnerTestCase
	if len(task.TestCaseList) > 0 {
		for _, tc := range task.TestCaseList {
			testCasesList = append(testCasesList, runnerTestCase{
				Input:    tc.Input,
				Expected: tc.Output,
				Hidden:   tc.IsHidden,
			})
		}
	} else {
		for input, expected := range task.TestCases {
			testCasesList = append(testCasesList, runnerTestCase{
				Input:    input,
				Expected: fmt.Sprint(expected),
				Hidden:   false,
			})
		}
	}

	payload := runnerPayload{
		Cmd:       cleanCmd,
		TimeoutMs: timeoutMs,
		TestCases: testCasesList,
	}

	payloadBytes, jsonErr := json.Marshal(payload)
	if jsonErr == nil {
		judgeCmd := []string{"python3", "-c", inContainerJudgeScript}
		stdout, _, runErr := execCommand(ctx, cli, containerID, judgeCmd, string(payloadBytes))
		if runErr == nil && stdout != "" {
			var res runnerResult
			if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &res); err == nil && res.RunnerError == "" {
				totalTime := time.Duration(res.TotalTimeMs) * time.Millisecond
				if !res.Passed {
					failedInfo = FailedInfo{
						isFailed:       true,
						ErrorMessage:   res.Error,
						TestCase:       res.TestCase,
						ActualOutput:   res.Actual,
						ExpectedOutput: res.Expected,
						IsHidden:       res.IsHidden,
						PassedCount:    res.PassedCount,
						TotalCount:     res.TotalCount,
					}
				} else {
					failedInfo = FailedInfo{
						isFailed:     false,
						ActualOutput: res.Actual,
						IsHidden:     false,
						PassedCount:  res.PassedCount,
						TotalCount:   res.TotalCount,
					}
				}

				SaveSubmissionResult(task, totalTime, 0, &failedInfo)
				utils.TaskInfo.IncrementTime(totalTime)
				return nil
			}
		}
	}

	// Fallback to sequential test execution if single-exec runner encounters issues
	var totalTime time.Duration
	var seqCases []utils.TestCaseItem
	if len(task.TestCaseList) > 0 {
		seqCases = task.TestCaseList
	} else {
		for in, exp := range task.TestCases {
			seqCases = append(seqCases, utils.TestCaseItem{
				Input:    in,
				Output:   exp,
				IsHidden: false,
			})
		}
	}

	passedCountSeq := 0
	totalCountSeq := len(seqCases)

	for _, tc := range seqCases {
		ectx, cancel := context.WithTimeout(ctx, time.Second*3)
		start := time.Now()
		output, runStderr, err := execCommand(ectx, cli, containerID, runtime.RunCmd, tc.Input+"\n")
		elapsed := time.Since(start)
		totalTime += elapsed
		cancel()

		if ectx.Err() == context.DeadlineExceeded {
			tcInput := tc.Input
			if tc.IsHidden {
				tcInput = "[Hidden Test Case]"
			}
			failedInfo = FailedInfo{
				isFailed:     true,
				ErrorMessage: "Time Limit Exceeded (>3s)",
				TestCase:     tcInput,
				IsHidden:     tc.IsHidden,
				PassedCount:  passedCountSeq,
				TotalCount:   totalCountSeq,
			}
			break
		}

		if err != nil {
			return err
		}

		actual := normalizeOutput(output)
		exp := normalizeOutput(tc.Output)

		if exp == "true" || exp == "false" {
			if actual == "0" || actual == "False" {
				actual = "false"
			} else if actual == "1" || actual == "True" {
				actual = "true"
			}
		}

		if actual != exp {
			errorMsg := "Wrong Answer"
			if actual == "" && runStderr != "" {
				errorMsg = "Runtime Error / Segfault"
				actual = runStderr
			}

			tcInput := tc.Input
			actualOut := actual
			expOut := exp
			if tc.IsHidden {
				tcInput = "[Hidden Test Case]"
				actualOut = ""
				expOut = ""
			}

			failedInfo = FailedInfo{
				isFailed:       true,
				ErrorMessage:   errorMsg,
				TestCase:       tcInput,
				ActualOutput:   actualOut,
				ExpectedOutput: expOut,
				IsHidden:       tc.IsHidden,
				PassedCount:    passedCountSeq,
				TotalCount:     totalCountSeq,
			}
			break
		} else {
			passedCountSeq++
		}
	}

	if !failedInfo.isFailed {
		failedInfo = FailedInfo{
			isFailed:    false,
			PassedCount: passedCountSeq,
			TotalCount:  totalCountSeq,
		}
	}

	memory := 0
	SaveSubmissionResult(task, totalTime, memory, &failedInfo)
	utils.TaskInfo.IncrementTime(totalTime)
	return nil
}

func worker(ctx context.Context) {
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
	imageName := utils.ExecutionImage()
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

	if _, err := apiClient.ContainerStart(ctx, resp.ID, client.ContainerStartOptions{}); err != nil {
		KillContainerByID(ctx, containerName)
		SpawnWorkerFailed(ctx)
		return
	}

	// Register and increment count only once container is running
	utils.WorkerPoolData.Increment()
	utils.WorkerPoolData.RegisterWorker(resp.ID)
	defer func() {
		utils.WorkerPoolData.UnregisterWorker(resp.ID)
		utils.WorkerPoolData.Decrement()
		KillContainerByID(ctx, containerName)
	}()

	fmt.Println(utils.Green+"Worker started - Active Workers:"+utils.Reset, utils.WorkerPoolData.GetCount(), utils.Green+"Container ID:"+utils.Reset, containerName)

	for {
		task := utils.WorkerPoolData.GetTask()
		if task.StopSignal != nil && *task.StopSignal {
			fmt.Println(utils.Yellow+"Worker received stop signal, shutting down container:"+utils.Reset, containerName)
			return
		}
		fmt.Println("Worker received task:", task.TaskID)
		eventType := utils.EVENTTYPERUN
		if strings.EqualFold(task.Type, "Submit") || strings.EqualFold(task.Type, "All") {
			eventType = utils.EVENTTYPESUBMIT
		}
		if !task.BattleID.IsZero() {
			utils.WSServer.Add(utils.WSSPayload{
				UserID:       task.UserID,
				BattleID:     task.BattleID,
				SubmissionID: nil,
				ProblemID:    task.Problem.ID,
				Event:        utils.EVENTTYPE(eventType),
			})
		}

		// Register the current task for tracking
		utils.WorkerPoolData.SetActiveTask(resp.ID, &task)

		runCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		err := RunTask(runCtx, apiClient, resp.ID, &task)
		cancel()

		if err != nil {
			fmt.Println(utils.Red+"Worker failed task:"+utils.Reset, task.TaskID, "Error:", err)

			// Record failure result so the client / battle does not hang indefinitely
			failedInfo := FailedInfo{
				isFailed:     true,
				ErrorMessage: fmt.Sprintf("Execution Error: %v", err),
			}
			SaveSubmissionResult(&task, 0, 0, &failedInfo)

			// Clean up active task registration
			utils.WorkerPoolData.ClearActiveTask(resp.ID)

			// Spawn replacement worker if this was a natural worker crash
			if utils.WorkerPoolData.IsWorkerRegistered(resp.ID) {
				SpawnWorkerFailed(ctx)
			}
			return
		}

		fmt.Println("Worker completed task:", task.TaskID, "by worker:", containerName)
		utils.WorkerPoolData.ClearActiveTask(resp.ID)
	}
}
