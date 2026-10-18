import os
import sys

from bicho import Client, Config, DeliveryError

endpoint = os.environ.get('BICHO_ENDPOINT')
key = os.environ.get('BICHO_PUBLIC_KEY')
if not endpoint or not key:
    sys.exit('Set BICHO_ENDPOINT and BICHO_PUBLIC_KEY before running this example')

try:
    tracker = Client(Config(
        endpoint,
        key,
        secret=os.environ.get('BICHO_INGEST_SECRET'),
        service_name='bicho-example/python',
        environment='example',
        release='bicho-examples@1.0.0',
    ))
    try:
        raise RuntimeError('Bicho Python example')
    except RuntimeError as error:
        uid = tracker.capture_exception(
            error,
            tags={'example': 'python'},
            contexts={'example': {'operation': 'intentional-error'}},
        )
except (DeliveryError, ValueError) as error:
    sys.exit(f'Bicho reporting failed: {error}')

print(uid)
