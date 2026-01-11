package logging

import (
	"fmt"
	"log"
)

// CLI color constants - moved here to avoid import cycle with config package
const (
	CLI_RESET       = "\033[0m"
	CLI_RED         = "\033[31m"
	CLI_BLUE        = "\033[34m"
	CLI_YELLOW      = "\033[33m"
	CLI_BRIGHT_CYAN = "\033[96m"
	CLI_BRIGHT_GREEN = "\033[92m"
)

func Error(message string) {
	log.Println(CLI_RED + "[FATAL]" + CLI_RESET + message)
}

func Fatal(message string, error error) {
	log.Fatal(CLI_RED + "[FATAL]" + CLI_RESET + message)
}

func Info(message string, args ...any) {
	output := fmt.Sprintf(message, args...)
	log.Println(CLI_BLUE + "[INFO]:" + CLI_RESET + output)
}

func Warning(message string) {
	log.Println(CLI_YELLOW + "[WARN]:" + CLI_RESET + message)
}

func Api(message string, args ...any) {
	output := fmt.Sprintf(message, args...)
	log.Println(CLI_BRIGHT_CYAN + "[API]:" + CLI_RESET + output)
}

func DB(message string, args ...any) {
	output := fmt.Sprintf(message, args...)
	log.Println(CLI_BRIGHT_GREEN + "[DB]:" + CLI_RESET + output)
}


