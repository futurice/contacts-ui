FROM nginx:1.11.1
MAINTAINER Oleg Grenrus <oleg.grenrus@iki.fi>

RUN apt-get -yq update && apt-get -yq --no-install-suggests --no-install-recommends --force-yes install \
    ca-certificates \
    python \
   && rm -rf /var/lib/apt/lists/*

COPY nginx-contacts-ui-prod.conf /etc/nginx/nginx.conf.tmpl
COPY start.py /root/start.py
COPY dist /usr/share/nginx/html

EXPOSE 8000

WORKDIR /root
CMD ["python", "/root/start.py"]
