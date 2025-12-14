package lua

import (
	"context"
	"embed"
	"fmt"
	"sync"

	lua "github.com/yuin/gopher-lua"
)

//go:embed scripts/*.lua
var scriptsFS embed.FS

// Service manages Lua VM instances and script execution
type Service struct {
	vmPool    sync.Pool
	scripts   map[string]string
	scriptsMu sync.RWMutex
}

// NewService creates a new Lua service with embedded scripts
func NewService() (*Service, error) {
	s := &Service{
		scripts: make(map[string]string),
	}

	// Initialize VM pool
	s.vmPool = sync.Pool{
		New: func() interface{} {
			return lua.NewState()
		},
	}

	// Load embedded scripts
	if err := s.loadScripts(); err != nil {
		return nil, fmt.Errorf("failed to load scripts: %w", err)
	}

	return s, nil
}

// loadScripts loads all Lua scripts from the embedded filesystem
func (s *Service) loadScripts() error {
	entries, err := scriptsFS.ReadDir("scripts")
	if err != nil {
		return fmt.Errorf("failed to read scripts directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		scriptName := entry.Name()
		scriptPath := "scripts/" + scriptName

		scriptContent, err := scriptsFS.ReadFile(scriptPath)
		if err != nil {
			return fmt.Errorf("failed to read script %s: %w", scriptName, err)
		}

		s.scriptsMu.Lock()
		s.scripts[scriptName] = string(scriptContent)
		s.scriptsMu.Unlock()
	}

	return nil
}

// ExecuteScript executes a Lua script by name with the given arguments
// Returns the result as a map[string]interface{} or an error
func (s *Service) ExecuteScript(ctx context.Context, scriptName string, args map[string]interface{}) (map[string]interface{}, error) {
	// Get script content
	s.scriptsMu.RLock()
	scriptContent, exists := s.scripts[scriptName]
	s.scriptsMu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("script not found: %s", scriptName)
	}

	// Get VM from pool
	L := s.vmPool.Get().(*lua.LState)
	defer s.vmPool.Put(L)

	// Set up context cancellation (basic implementation)
	// Note: gopher-lua doesn't have built-in context support, so this is a best-effort approach
	done := make(chan error, 1)
	var result map[string]interface{}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				done <- fmt.Errorf("lua panic: %v", r)
			}
		}()

		// Load script
		if err := L.DoString(scriptContent); err != nil {
			done <- fmt.Errorf("failed to execute script: %w", err)
			return
		}

		// Prepare arguments
		argsTable := L.NewTable()
		for k, v := range args {
			argsTable.RawSetString(k, s.goToLuaValue(L, v))
		}

		// Call the main function (assuming scriptName without .lua extension)
		funcName := scriptName[:len(scriptName)-4] // Remove .lua extension
		if len(scriptName) < 5 || scriptName[len(scriptName)-4:] != ".lua" {
			funcName = scriptName
		}

		// For url_normalize.lua, the function is normalize_url
		if scriptName == "url_normalize.lua" {
			funcName = "normalize_url"
		}

		// Get the function from global scope
		fn := L.GetGlobal(funcName)
		if fn.Type() == lua.LTNil {
			done <- fmt.Errorf("function %s not found in script", funcName)
			return
		}

		if fn.Type() != lua.LTFunction {
			done <- fmt.Errorf("%s is not a function", funcName)
			return
		}

		// Call function with URL argument
		urlArg := ""
		if url, ok := args["url"].(string); ok {
			urlArg = url
		}

		L.Push(fn)
		L.Push(lua.LString(urlArg))
		if err := L.PCall(1, 1, nil); err != nil {
			done <- fmt.Errorf("failed to call function: %w", err)
			return
		}

		// Get return value
		ret := L.Get(-1)
		L.Pop(1)

		// Convert Lua value to Go map
		result = s.luaValueToGoMap(L, ret)
		done <- nil
	}()

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case err := <-done:
		if err != nil {
			return nil, err
		}
		return result, nil
	}
}

// goToLuaValue converts a Go value to a Lua value
func (s *Service) goToLuaValue(L *lua.LState, v interface{}) lua.LValue {
	switch val := v.(type) {
	case string:
		return lua.LString(val)
	case int:
		return lua.LNumber(val)
	case int64:
		return lua.LNumber(val)
	case float64:
		return lua.LNumber(val)
	case bool:
		return lua.LBool(val)
	case nil:
		return lua.LNil
	case map[string]interface{}:
		table := L.NewTable()
		for k, v := range val {
			table.RawSetString(k, s.goToLuaValue(L, v))
		}
		return table
	case []interface{}:
		table := L.NewTable()
		for i, v := range val {
			table.RawSetInt(i+1, s.goToLuaValue(L, v))
		}
		return table
	default:
		return lua.LString(fmt.Sprintf("%v", val))
	}
}

// luaValueToGoMap converts a Lua value to a Go map
func (s *Service) luaValueToGoMap(L *lua.LState, lv lua.LValue) map[string]interface{} {
	if lv.Type() != lua.LTTable {
		// If not a table, try to convert to a simple value
		return map[string]interface{}{
			"value": s.luaValueToGoValue(lv),
		}
	}

	table := lv.(*lua.LTable)
	result := make(map[string]interface{})

	table.ForEach(func(key lua.LValue, value lua.LValue) {
		keyStr := key.String()
		result[keyStr] = s.luaValueToGoValue(value)
	})

	return result
}

// luaValueToGoValue converts a Lua value to a Go value
func (s *Service) luaValueToGoValue(lv lua.LValue) interface{} {
	switch lv.Type() {
	case lua.LTNil:
		return nil
	case lua.LTBool:
		return bool(lv.(lua.LBool))
	case lua.LTString:
		return string(lv.(lua.LString))
	case lua.LTNumber:
		return float64(lv.(lua.LNumber))
	case lua.LTTable:
		table := lv.(*lua.LTable)
		result := make(map[string]interface{})
		table.ForEach(func(key lua.LValue, value lua.LValue) {
			keyStr := key.String()
			result[keyStr] = s.luaValueToGoValue(value)
		})
		return result
	default:
		return lv.String()
	}
}

// NormalizeURL is a convenience method specifically for URL normalization
func (s *Service) NormalizeURL(ctx context.Context, url string) (map[string]interface{}, error) {
	args := map[string]interface{}{
		"url": url,
	}
	return s.ExecuteScript(ctx, "url_normalize.lua", args)
}

// Close cleans up resources (currently just clears scripts)
func (s *Service) Close() error {
	s.scriptsMu.Lock()
	defer s.scriptsMu.Unlock()
	s.scripts = make(map[string]string)
	return nil
}

