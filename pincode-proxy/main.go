package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// CORS middleware
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Simple pincode handler - only uses the specified API
func pincodeHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pincode := vars["pincode"]

	if pincode == "" {
		http.Error(w, "Pincode is required", http.StatusBadRequest)
		return
	}

	// Use ONLY the specified API endpoint
	apiURL := fmt.Sprintf("http://www.postalpincode.in/api/pincode/%s", pincode)

	// Create HTTP client with reasonable timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create request with browser-like headers to avoid blocking
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Add headers to appear like a regular browser request
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	// Make the request
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error fetching data from postal API: %v", err)
		http.Error(w, "Failed to fetch pincode data", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response body: %v", err)
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	// Return the response as-is
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)

	log.Printf("Successfully proxied request for pincode: %s", pincode)
}

// Health check handler
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"OK","message":"Simple Go CORS proxy is running"}`))
}

func main() {
	r := mux.NewRouter()
	r.Use(enableCORS)

	r.HandleFunc("/pincode/{pincode}", pincodeHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/health", healthHandler).Methods("GET")

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"message": "Simple Go CORS Proxy for postalpincode.in",
			"endpoint": "http://www.postalpincode.in/api/pincode/{pincode}",
			"usage": "/pincode/{pincode}",
			"example": "http://localhost:8080/pincode/110001"
		}`))
	}).Methods("GET")

	port := ":8080"
	fmt.Printf("🚀 Simple Go CORS Proxy running on http://localhost%s\n", port)
	fmt.Printf("📍 Using API: http://www.postalpincode.in/api/pincode/{pincode}\n")
	fmt.Printf("🔗 Test: http://localhost%s/pincode/641114\n", port)

	log.Fatal(http.ListenAndServe(port, r))
}