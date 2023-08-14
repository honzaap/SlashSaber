import { Settings } from "./game/models/Settings";

const AWS_URL = "https://ivj6suabnxk5izibdy4uyp5pni0mraue.lambda-url.eu-central-1.on.aws/";

export async function fetchLeaderBoard() {
    return [{ username: "aws", score: 500 }];
    try {
        const response = await fetch(AWS_URL, {
            method: "GET"
        });
        const result = await response.json();

        return result;
    }
    catch {
        return [];
    }
}

export async function submitRun(settings : Settings, score : number) {
    return;
    await fetch(AWS_URL, {
        method: "POST",
        body: JSON.stringify({
            username: settings.username, 
            score,
            settings,
        }),
    });
}