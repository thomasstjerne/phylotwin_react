FROM jekyll/jekyll:4

# Set working directory
WORKDIR /srv/jekyll

# Copy Gemfile and install dependencies
COPY Gemfile ./
RUN bundle install

# Copy the rest of the documentation sources
COPY . ./

# Build the site into the _site directory on container start by default
CMD ["bundle", "exec", "jekyll", "build", "--config", "_config.yml", "--destination", "_site"] 

