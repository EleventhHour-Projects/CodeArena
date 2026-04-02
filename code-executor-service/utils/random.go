package utils

import (
	"math/rand"
)

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0987654321"

// RandomString generates a random string of the specified length using a combination of uppercase letters,
// lowercase letters, and digits, allowing for the creation of unique identifiers or tokens for various purposes
// within the code execution service, such as session IDs, temporary file names,
// or other random values needed for the application's functionality.
// RandomString generates a random string...
func RandomString(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func RandomInt(n int) int {
	return rand.Intn(n)
}
