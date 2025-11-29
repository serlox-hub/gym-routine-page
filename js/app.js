async function loadRoutines() {
    const container = document.getElementById('routines-container');
    container.innerHTML = '<p class="loading">Cargando rutinas...</p>';

    try {
        const indexResponse = await fetch('routines/index.json');
        if (!indexResponse.ok) throw new Error('No se pudo cargar el índice de rutinas');

        const routineNames = await indexResponse.json();

        const routines = await Promise.all(
            routineNames.map(async (name) => {
                const response = await fetch(`routines/${name}.json`);
                if (!response.ok) throw new Error(`No se pudo cargar ${name}.json`);
                return response.json();
            })
        );

        renderRoutines(routines);
    } catch (error) {
        container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        console.error(error);
    }
}

function renderRoutines(routines) {
    const container = document.getElementById('routines-container');
    container.innerHTML = '';

    routines.forEach((routine, index) => {
        const card = document.createElement('div');
        card.className = 'routine-card';

        card.innerHTML = `
            <div class="routine-header" onclick="toggleRoutine(${index})">
                <div>
                    <div class="routine-title">${routine.name}</div>
                    ${routine.description ? `<div class="routine-description">${routine.description}</div>` : ''}
                </div>
                <span class="routine-toggle">▼</span>
            </div>
            <div class="exercise-list">
                ${routine.exercises.map(exercise => `
                    <div class="exercise-item">
                        <div>
                            <div class="exercise-name">${exercise.name}</div>
                            <div class="exercise-muscle">${exercise.muscle}</div>
                        </div>
                        <div class="exercise-sets">${exercise.sets} × ${exercise.reps}</div>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(card);
    });
}

function toggleRoutine(index) {
    const cards = document.querySelectorAll('.routine-card');
    cards[index].classList.toggle('expanded');
}

document.addEventListener('DOMContentLoaded', loadRoutines);
