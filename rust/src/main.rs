use bicho::{Client, Config, Event};
use std::{env, process::ExitCode};

#[tokio::main]
async fn main() -> ExitCode {
    match report().await {
        Ok(uid) => {
            println!("{uid}");
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}

async fn report() -> Result<String, &'static str> {
    let endpoint = env::var("BICHO_ENDPOINT")
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or("Set BICHO_ENDPOINT and BICHO_PUBLIC_KEY.")?;
    let key = env::var("BICHO_PUBLIC_KEY")
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or("Set BICHO_ENDPOINT and BICHO_PUBLIC_KEY.")?;
    let mut config = Config::new(endpoint, key)
        .service_name("bicho-example/rust")
        .environment("example")
        .release("bicho-examples@1.0.0");
    match env::var("BICHO_INGEST_SECRET") {
        Ok(secret) if !secret.is_empty() => config = config.secret(secret),
        Err(env::VarError::NotUnicode(_)) => return Err("Invalid Bicho configuration."),
        _ => {}
    }
    let client = Client::new(config).map_err(|_| "Invalid Bicho configuration.")?;
    let error = match "not-a-number".parse::<u64>() {
        Err(error) => error,
        Ok(_) => return Err("Expected the example number parsing to fail."),
    };
    let event = Event::from_error(&error)
        .with_tag("example", "rust")
        .with_context("operation", "example");
    client
        .send(&event)
        .await
        .map_err(|_| "Bicho delivery failed.")
}
