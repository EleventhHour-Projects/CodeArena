package worker_test

import (
	"testing"

	"executor-service/worker"
)

func TestRuntimeForLanguage_Cpp(t *testing.T) {
	runtime, ok := worker.RuntimeForLanguage("cpp")
	if !ok {
		t.Fatal("expected cpp to be supported")
	}
	if runtime.SourceFile != "/tmp/main.cpp" {
		t.Fatalf("unexpected source file: %q", runtime.SourceFile)
	}
	if len(runtime.CompileCmd) == 0 || runtime.CompileCmd[0] != "g++" {
		t.Fatalf("unexpected compile command: %#v", runtime.CompileCmd)
	}
	if len(runtime.RunCmd) == 0 || runtime.RunCmd[0] != "timeout" {
		t.Fatalf("unexpected run command: %#v", runtime.RunCmd)
	}
}

func TestRuntimeForLanguage_Python(t *testing.T) {
	runtime, ok := worker.RuntimeForLanguage("python")
	if !ok {
		t.Fatal("expected python to be supported")
	}
	if runtime.SourceFile != "/tmp/main.py" {
		t.Fatalf("unexpected source file: %q", runtime.SourceFile)
	}
	if len(runtime.CompileCmd) != 0 {
		t.Fatalf("python should not compile, got %#v", runtime.CompileCmd)
	}
	if len(runtime.RunCmd) < 3 || runtime.RunCmd[2] != "python3" {
		t.Fatalf("unexpected run command: %#v", runtime.RunCmd)
	}
}

func TestRuntimeForLanguage_Unsupported(t *testing.T) {
	_, ok := worker.RuntimeForLanguage("rust")
	if ok {
		t.Fatal("expected rust to be unsupported in the current image")
	}
}
