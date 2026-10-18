const form = document.querySelector('form');
const button = form.querySelector('button');
const status = document.querySelector('#status');
let client;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  button.disabled = true;
  status.textContent = 'Sending one example error…';
  try {
    if (client) await client.close(5000);
    client = window.Bicho.createClient({
      endpoint: form.elements.endpoint.value,
      key: form.elements.key.value,
      serviceName: 'bicho-example/browser',
      environment: 'example',
      release: 'bicho-examples@1.0.0',
      autoCapture: false,
    });
    let uid;
    try {
      throw new Error('Bicho browser example');
    } catch (error) {
      uid = client.captureException(error, { tags: { example: 'browser' } });
    }
    const delivered = await client.close(5000);
    status.textContent = uid && delivered
      ? `Delivery acknowledged. Occurrence UID: ${uid}. This is not the stored event ID.`
      : 'Delivery failed or the error was dropped. Check your collector configuration and try again.';
  } catch {
    status.textContent = 'Could not send. Check the endpoint, public key, and SDK installation, then try again.';
  } finally {
    button.disabled = false;
  }
});
