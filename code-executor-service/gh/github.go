package gh

import (
	"context"
	"executor-service/utils"
	"fmt"
	"strings"
	"time"

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

// GetAllPRs fetches all open PRs from the repository. If a label is provided, it filters the PRs to include only those with the specified label. This allows clients to easily retrieve PRs based on their categorization, such as difficulty level or type of change.
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

// GetNumberOfQuestionByLabel counts the number of question files in the repository that are categorized under a specific label (e.g., "easy", "medium", "hard"). It does this by fetching the contents of the corresponding directory in the GitHub repository and counting the number of JSON files, which represent individual questions. This function helps clients understand how many questions are available for each difficulty level, aiding in task assignment and workload management.
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

// MergeBotPR merges the specified PRs using the "squash" method, which combines all commits from the PR into a single commit on the base branch. After merging, it deletes the source branch to keep the repository clean. This function is essential for automating the PR merging process, ensuring that code changes are integrated smoothly while maintaining a tidy commit history. The 300ms sleep between merges helps to avoid hitting GitHub API rate limits when merging multiple PRs in quick succession.
func MergeBotPR(ctx context.Context, client *utils.GitHubClient, prNumber []int) error {
	for _, num := range prNumber {
		pr, _, err := client.Client.PullRequests.Get(ctx, client.Owner, client.Repo, num)
		if err != nil {
			return err
		}

		opts := &github.PullRequestOptions{
			MergeMethod: "squash",
			CommitTitle: pr.GetTitle(),
		}
		_, _, err = client.Client.PullRequests.Merge(ctx, client.Owner, client.Repo, num, "", opts)
		if err != nil {
			return err
		}

		// delete the branch after merging
		branchName := pr.GetHead().GetRef()
		_, err = client.Client.Git.DeleteRef(ctx, client.Owner, client.Repo, "refs/heads/"+branchName)
		if err != nil {
			return err
		}
		time.Sleep(time.Millisecond * 300) // Sleep for 300ms to avoid hitting GitHub API rate limits
	}
	return nil
}

// ListAllPrs retrieves all open pull requests from the GitHub repository. This function is useful for clients that need to display or process the list of active PRs, allowing them to stay informed about ongoing contributions and changes in the codebase. By providing a comprehensive list of PRs, clients can make informed decisions about which PRs to review, merge, or prioritize based on their content and labels.
func ListAllPrs(ctx context.Context, client *utils.GitHubClient) ([]*github.PullRequest, error) {
	opt := &github.PullRequestListOptions{
		State: "open",
		ListOptions: github.ListOptions{
			PerPage: 100,
		},
	}
	prs, _, err := client.Client.PullRequests.List(ctx, client.Owner, client.Repo, opt)
	return prs, err
}
