FROM debian:bookworm-slim

WORKDIR /app

# Copy the pre-built executable
COPY dist/labeler /app/labeler

# Expose the port (adjust if your app uses a different port)
EXPOSE 4001

# Run the compiled binary
CMD ["/app/labeler"] 