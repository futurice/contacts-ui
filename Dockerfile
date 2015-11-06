FROM futurice/base-images:nodejs
MAINTAINER Oleg Grenrus <oleg.grenrus@iki.fi>

# Create user
RUN useradd -m -s /bin/bash -d /app app

# Install dependencies
WORKDIR /app
ADD package.json /app/package.json

# Build dependencies
RUN npm install

# Add rest and build the app
ADD . /app
RUN make clean && make

# Finalise
RUN chown -R app:app /app

EXPOSE 8000

# Default startup command
USER app
WORKDIR /app
CMD ["node", "app.js"]
