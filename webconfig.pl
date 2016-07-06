# Here we experimented how to do live config
use strict;

print "{" .
  "\"FUM_BASEURL\": \"" .  $ENV{"FUM_BASEURL"} . "\", " . # note the comma
  "\"AVATAR_BASEURL\": \"" .  $ENV{"AVATAR_BASEURL"} . "\"" .
  "}";
