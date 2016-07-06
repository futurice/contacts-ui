# Script to start nginx

import os
import json

fum_baseurl    = os.environ['FUM_BASEURL']
avatar_baseurl = os.environ['AVATAR_BASEURL']
contacts_api_baseurl = os.environ['CONTACTS_BASEURL']

# config.json
config = {
  'FUM_BASEURL': fum_baseurl,
  'AVATAR_BASEURL': avatar_baseurl}

with open('/usr/share/nginx/html/config.json', 'w') as f:
    json.dump(config, f)

# Nginx config
with open('/etc/nginx/nginx.conf.tmpl', 'r') as ftmpl:
    contents = ftmpl.read()
    contents = contents.replace('$contacts_api_baseurl', contacts_api_baseurl)
    with open('/etc/nginx/nginx.conf', 'w') as f:
        f.write(contents)

# start nginx
os.execlp('nginx', '-g', 'daemon off;')
