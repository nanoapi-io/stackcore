FROM debian:bookworm-slim

WORKDIR /app

# Copy the pre-built executable
COPY dist/core /app/core

# Expose the port (adjust if your app uses a different port)
EXPOSE 4000

# Run the compiled binary
CMD ["/app/core"] 