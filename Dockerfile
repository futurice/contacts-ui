FROM nginx:1.13.9
MAINTAINER Oleg Grenrus <oleg.grenrus@iki.fi>

RUN apt-get -yq update && apt-get -yq --no-install-suggests --no-install-recommends install \
    ca-certificates \
    python \
   && rm -rf /var/lib/apt/lists/*

COPY nginx/prod.conf /root/default.conf.tmpl
COPY nginx/start.py /root/start.py
COPY dist /usr/share/nginx/html

EXPOSE 8000

WORKDIR /root
CMD ["python", "/root/start.py"]
