<?php
	$static_ip = getenv('STATIC_APP');
	$dynamic_ip = getenv('DYNAMIC_APP');
?>

<VirtualHost *:80>
    ServerName demo.api.ch
    
    ProxyPass '/zoo/animals/' 'http://<?php print "$dynamic_ip"?>/'
    ProxyPassReverse '/zoo/animals/' 'http://<?php print "$dynamic_ip"?>/'
    
    ProxyPass '/' 'http://<?php print "$static_ip"?>/'
    ProxyPassReverse '/' 'http://<?php print "$static_ip"?>/'
</VirtualHost>