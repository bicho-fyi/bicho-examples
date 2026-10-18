<?php
declare(strict_types=1);

use Bicho\Client;
use Bicho\Config;
use Bicho\DeliveryException;

require __DIR__ . '/vendor/autoload.php';

$endpoint = getenv('BICHO_ENDPOINT');
$key = getenv('BICHO_PUBLIC_KEY');
if ($endpoint === false || $endpoint === '' || $key === false || $key === '') {
    fwrite(STDERR, "Set BICHO_ENDPOINT and BICHO_PUBLIC_KEY.\n");
    exit(1);
}

$secret = getenv('BICHO_INGEST_SECRET');

try {
    $client = new Client(new Config(
        endpoint: $endpoint,
        key: $key,
        serviceName: 'bicho-example/php',
        environment: 'example',
        release: 'bicho-examples@1.0.0',
        secret: $secret === false || $secret === '' ? null : $secret,
    ));
} catch (Throwable) {
    fwrite(STDERR, "Invalid Bicho configuration.\n");
    exit(1);
}

try {
    throw new RuntimeException('Bicho PHP example');
} catch (RuntimeException $error) {
    try {
        $uid = $client->captureException($error,
            tags: ['example' => 'php'],
            contexts: ['operation' => 'example'],
        );
        echo $uid . "\n";
    } catch (DeliveryException) {
        fwrite(STDERR, "Bicho delivery failed.\n");
        exit(1);
    }
}
