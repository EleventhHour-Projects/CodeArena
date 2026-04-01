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
	users, len := utils.UserPoolInstance.GetAllUsers()
	if len < 2 {
		return
	}
	slices.SortFunc(users, func(a, b *utils.User) int {
		return cmp.Compare(b.Rating, a.Rating)
	})
	for i := 0; i < len-1; i += 2 {
		user1 := users[i]
		user2 := users[i+1]
		NotifyUser(user1, user2)
	}
}
