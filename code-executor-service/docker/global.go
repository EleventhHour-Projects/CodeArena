package docker

import (
	"context"

	"github.com/docker/go-sdk/client"
)

var DockerClient *client.SDKClient

func InitDocker() error {
	cli, err := client.New(context.Background(), client.WithDockerContext("my-docker-context"))
	if err != nil {
		return err
	}
	DockerClient = &cli
	return nil
}
