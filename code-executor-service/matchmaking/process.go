package matchmaking

import (
	"cmp"
	"context"
	"executor-service/utils"
	"fmt"
	"slices"
	"time"
)

func ProcessMatchmaking(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			fmt.Println("Matchmaking process stopped")
			return
		default:
			MatchMaker()
		}
		time.Sleep(time.Second * 10)
	}
}

func MatchMaker() {
	allUsers, _ := utils.UserPoolInstance.GetAllUsers()

	// Group available users by difficulty
	byDifficulty := make(map[string][]*utils.User)
	for _, u := range allUsers {
		if _, ok := utils.MatchPoolInstance.GetMatchByConnID(u.AllotedConnID); !ok {
			byDifficulty[u.Difficulty] = append(byDifficulty[u.Difficulty], u)
		}
	}

	for _, users := range byDifficulty {
		n := len(users)
		if n < 2 {
			continue
		}

		slices.SortFunc(users, func(a, b *utils.User) int {
			return cmp.Compare(b.Rating, a.Rating)
		})

		for i := 0; i < n-1; i += 2 {
			user1 := users[i]
			user2 := users[i+1]

			if utils.RejectionRegistryInstance.IsRejected(user1.Username, user2.Username) {
				continue
			}

			NotifyUser(user1, user2)
		}
	}
}
