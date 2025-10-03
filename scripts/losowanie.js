function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getPlayers() {
    const input = document.getElementById('player-input').value;
    return input.split('\n')
                .map(player => player.trim())
                .filter(player => player.length > 0);
}

function drawTeams() {
    const players = getPlayers();
    const resultsDiv = document.getElementById('results');
    const teamSize = parseInt(document.getElementById('team-size').value);
    if (players.length === 0) {
        resultsDiv.innerHTML = "Wprowadź graczy, aby móc losować drużyny!";
        return;
    }
    if (isNaN(teamSize) || teamSize < 1) {
        resultsDiv.innerHTML = "Rozmiar drużyny musi być liczbą większą niż 0!";
        return;
    }
    shuffle(players);
    let output = '';
    let teamNumber = 1;
    for (let i = 0; i < players.length; i += teamSize) {
        const team = players.slice(i, i + teamSize);
        output += `<span class="team-name">Drużyna ${teamNumber}:</span> ${team.join(', ')}\n`;
        teamNumber++;
    }
    if (players.length % teamSize !== 0) {
        output += `<br><span class="team-name" style="color: #FAA61A;">Uwaga:</span> Niektórzy gracze zostali dobrani do mniejszych drużyn lub pominięci w pełnych. Liczba graczy: ${players.length}, Rozmiar drużyny: ${teamSize}.`;
    }
    resultsDiv.innerHTML = output;
}

function drawSingle() {
    const players = getPlayers();
    const resultsDiv = document.getElementById('results');
    if (players.length === 0) {
        resultsDiv.innerHTML = "Wprowadź graczy, aby móc losować jedną osobę!";
        return;
    }
    shuffle(players);
    const winner = players[0];
    let output = `<span class="team-name">Zwycięzca losowania:</span><br>`;
    output += `<span class="single-winner">${winner}</span>`;
    resultsDiv.innerHTML = output;
}