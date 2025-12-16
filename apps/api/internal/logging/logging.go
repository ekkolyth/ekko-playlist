package logging

import (
	"fmt"
	"log"

	"github.com/ekkolyth/ekko-playlist/api/internal/config"
)

// Simple logging utility with color support for terminal output, used across the API.

func Error(message string) {
	log.Println(config.CLI_RED + "[FATAL]" + config.CLI_RESET + message)
}

func Fatal(message string, error error) {
	log.Fatal(config.CLI_RED + "[FATAL]" + config.CLI_RESET + message)
}

func Info(message string, args ...any) {
	output := fmt.Sprintf(message, args...)
	log.Println(config.CLI_BLUE + "[INFO]:" + config.CLI_RESET + output)
}

func Warning(message string) {
	log.Println(config.CLI_YELLOW + "[WARN]:" + config.CLI_RESET + message)
}

func Api(message string) {
	log.Println(config.CLI_BRIGHT_CYAN + "[API]:" + config.CLI_RESET + message)
}


