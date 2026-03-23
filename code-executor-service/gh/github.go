package gh

import (
	"context"
	"executor-service/utils"
	"fmt"
	"strings"

	"github.com/google/go-github/v84/github"
	"golang.org/x/oauth2"
)

func NewGitHubClient(token, owner, repo string) *utils.GitHubClient {
	ctx := context.Background()

	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	tc := oauth2.NewClient(ctx, ts)

	client := github.NewClient(tc)

	return &utils.GitHubClient{
		Client: client,
		Owner:  owner,
		Repo:   repo,
	}
}

func InitGH() {
	utils.GhClient = NewGitHubClient(utils.GITHUB_TOKEN, "EleventhHour-Projects", "CodeArena")
}

func CreatePR(client *utils.GitHubClient, ctx context.Context, branchName, title, body string, files map[string][]byte, lable string) (*github.PullRequest, error) {
	// 1. Get the repository to find the default branch
	repo, _, err := client.Client.Repositories.Get(ctx, client.Owner, client.Repo)
	if err != nil {
		return nil, err
	}
	baseBranch := *repo.DefaultBranch

	// 2. Get the ref for the default branch
	baseRef, _, err := client.Client.Git.GetRef(ctx, client.Owner, client.Repo, "refs/heads/"+baseBranch)
	if err != nil {
		return nil, err
	}

	// 2. Create the tree
	entries := []*github.TreeEntry{}
	for path, content := range files {
		contentStr := string(content)
		entries = append(entries, &github.TreeEntry{
			Path:    github.String(path),
			Mode:    github.String("100644"),
			Type:    github.String("blob"),
			Content: github.String(contentStr),
		})
	}

	tree, _, err := client.Client.Git.CreateTree(ctx, client.Owner, client.Repo, *baseRef.Object.SHA, entries)
	if err != nil {
		return nil, err
	}

	// 3. Create the commit
	commit, _, err := client.Client.Git.CreateCommit(ctx, client.Owner, client.Repo, github.Commit{
		Message: github.String(title),
		Tree:    tree,
		Parents: []*github.Commit{
			{SHA: baseRef.Object.SHA},
		},
	}, nil)
	if err != nil {
		return nil, err
	}

	// 4. Create the branch reference
	ref := github.CreateRef{
		Ref: "refs/heads/" + branchName,
		SHA: *commit.SHA,
	}
	_, _, err = client.Client.Git.CreateRef(ctx, client.Owner, client.Repo, ref)
	if err != nil {
		return nil, err
	}

	// 5. Create the PR
	pr, _, err := client.Client.PullRequests.Create(ctx, client.Owner, client.Repo, &github.NewPullRequest{
		Title: github.String(title),
		Body:  github.String(body),
		Head:  github.String(branchName),
		Base:  github.String(baseBranch),
	})
	utils.GhClient.Client.Issues.AddLabelsToIssue(ctx, client.Owner, client.Repo, *pr.Number, []string{lable})

	return pr, err
}

func GetAllPRs(ctx context.Context, lable *string) ([]*github.PullRequest, error) {
	opt := &github.PullRequestListOptions{
		State: "open",
		ListOptions: github.ListOptions{
			PerPage: 100,
		},
	}
	prs, _, err := utils.GhClient.Client.PullRequests.List(ctx, utils.GhClient.Owner, utils.GhClient.Repo, opt)
	if err != nil {
		return nil, err
	}
	if lable != nil {
		filteredPRs := []*github.PullRequest{}
		for _, pr := range prs {
			if pr.Labels[0].GetName() == *lable {
				filteredPRs = append(filteredPRs, pr)
			}
		}
		return filteredPRs, nil
	} else {
		return prs, nil
	}
}
func GetNumberOfQuestionByLabel(ctx context.Context, label string) (int, error) {
	if label == "" {
		return 0, nil
	}
	switch strings.ToLower(label) {
	case "easy":
		label = "easy"
	case "medium":
		label = "medium"
	case "hard":
		label = "hard"
	default:
		return 0, fmt.Errorf("invalid label: %s", label)
	}

	path := fmt.Sprintf("questions/%s", label)

	_, contents, _, err := utils.GhClient.Client.Repositories.GetContents(
		ctx,
		utils.GhClient.Owner,
		utils.GhClient.Repo,
		path,
		nil,
	)
	if err != nil {
		return 0, err
	}

	count := 0

	for _, file := range contents {
		// Only count JSON files
		if file.GetType() == "file" && strings.HasSuffix(file.GetName(), ".json") {
			count++
		}
	}

	return count, nil
}
