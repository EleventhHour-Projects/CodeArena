package gh

import (
	"context"
	"executor-service/utils"

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

func CreatePR(client *utils.GitHubClient, ctx context.Context, branchName, title, body string, files map[string][]byte) (*github.PullRequest, error) {
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

	return pr, err
}
