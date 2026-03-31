package worker

// NormalizeOutput exposes the private normalizeOutput function for testing.
// Only used by the test binary.
func NormalizeOutput(s string) string { return normalizeOutput(s) }
