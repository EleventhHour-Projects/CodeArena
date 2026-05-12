package main

import (
	"executor-service/utils"
	"testing"
)

type ImageSummaryMock struct {
	RepoTags []string
}

func TestCheckImageLogic(t *testing.T) {
	tests := []struct {
		name     string
		images   []ImageSummaryMock
		target   string
		expected bool
	}{
		{
			name: "Tag found",
			images: []ImageSummaryMock{
				{RepoTags: []string{utils.ExecutionImage()}},
			},
			target:   utils.ExecutionImage(),
			expected: true,
		},
		{
			name: "Tag found in multi-tag image",
			images: []ImageSummaryMock{
				{RepoTags: []string{"other:latest", utils.ExecutionImage()}},
			},
			target:   utils.ExecutionImage(),
			expected: true,
		},
		{
			name: "Tag found in later image",
			images: []ImageSummaryMock{
				{RepoTags: []string{"alpine:latest"}},
				{RepoTags: []string{utils.ExecutionImage()}},
			},
			target:   utils.ExecutionImage(),
			expected: true,
		},
		{
			name: "Dangling image (empty RepoTags) - NO PANIC",
			images: []ImageSummaryMock{
				{RepoTags: []string{}},
				{RepoTags: []string{utils.ExecutionImage()}},
			},
			target:   utils.ExecutionImage(),
			expected: true,
		},
		{
			name: "All dangling images - NO PANIC",
			images: []ImageSummaryMock{
				{RepoTags: []string{}},
				{RepoTags: nil},
			},
			target:   utils.ExecutionImage(),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			found := false
			for _, img := range tt.images {
				for _, tag := range img.RepoTags {
					if tag == tt.target {
						found = true
						break
					}
				}
				if found {
					break
				}
			}
			if found != tt.expected {
				t.Fatalf("expected found=%v, got %v", tt.expected, found)
			}
		})
	}
}
