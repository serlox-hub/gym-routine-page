function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

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

    routines.forEach((routine, routineIndex) => {
        const card = document.createElement('div');
        card.className = 'routine-card';

        // Detectar si es formato nuevo (con bloques) o formato simple
        const isNewFormat = routine.dias !== undefined;
        const days = isNewFormat ? routine.dias : routine.days;
        const routineName = isNewFormat ? routine.nombre : routine.name;
        const routineDesc = isNewFormat
            ? `${routine.perfil?.foco || ''} • ${routine.perfil?.frecuencia_dias || ''} días/semana`
            : routine.description;
        const fechaCreacion = routine.fecha_creacion ? formatDate(routine.fecha_creacion) : '';

        card.innerHTML = `
            <div class="routine-header" onclick="toggleRoutine(${routineIndex})">
                <div>
                    <div class="routine-title">${routineName}</div>
                    ${routineDesc ? `<div class="routine-description">${routineDesc}</div>` : ''}
                    ${fechaCreacion ? `<div class="routine-date">Creada: ${fechaCreacion}</div>` : ''}
                </div>
                <span class="routine-toggle">▼</span>
            </div>
            <div class="routine-content">
                ${isNewFormat ? renderNewFormatDays(days, routineIndex) : renderSimpleDays(days, routineIndex)}
            </div>
        `;

        container.appendChild(card);
    });
}

function renderSimpleDays(days, routineIndex) {
    return days.map((day, dayIndex) => `
        <div class="day-card">
            <div class="day-header" onclick="toggleDay(${routineIndex}, ${dayIndex}); event.stopPropagation();">
                <div>
                    <div class="day-title">${day.name}</div>
                    ${day.description ? `<div class="day-description">${day.description}</div>` : ''}
                </div>
                <span class="day-toggle">▼</span>
            </div>
            <div class="exercise-list">
                ${day.exercises.map(exercise => `
                    <div class="exercise-item">
                        <div>
                            <div class="exercise-name">${exercise.name}</div>
                            <div class="exercise-muscle">${exercise.muscle}</div>
                        </div>
                        <div class="exercise-sets">${exercise.sets} × ${exercise.reps}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function renderNewFormatDays(dias, routineIndex) {
    return dias.map((dia, dayIndex) => `
        <div class="day-card">
            <div class="day-header" onclick="toggleDay(${routineIndex}, ${dayIndex}); event.stopPropagation();">
                <div>
                    <div class="day-title">Día ${dia.dia}: ${dia.nombre}</div>
                    <div class="day-description">~${dia.duracion_estimada_min} min</div>
                </div>
                <span class="day-toggle">▼</span>
            </div>
            <div class="exercise-list">
                ${dia.calentamiento ? renderWarmup(dia.calentamiento) : ''}
                ${dia.bloques.map(bloque => `
                    <div class="block-section">
                        <div class="block-header">
                            <span class="block-name">${bloque.bloque}</span>
                            <span class="block-duration">${bloque.duracion_min} min</span>
                        </div>
                        ${bloque.ejercicios.map(ejercicio => renderExercise(ejercicio)).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function renderWarmup(calentamiento) {
    return `
        <div class="block-section warmup-section">
            <div class="block-header warmup-header">
                <span class="block-name">Calentamiento</span>
                <span class="block-duration">${calentamiento.duracion_min} min</span>
            </div>
            <div class="warmup-exercises">
                ${calentamiento.ejercicios.map(ej => `
                    <div class="warmup-item">
                        <span class="warmup-name">${ej.nombre}</span>
                        <span class="warmup-reps">${ej.reps}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderExercise(ejercicio) {
    const musculoPrincipal = ejercicio.musculos?.principal || '';
    const musculosSecundarios = ejercicio.musculos?.secundarios?.join(', ') || '';

    return `
        <div class="exercise-item expanded-exercise">
            <div class="exercise-main">
                <div class="exercise-name">${ejercicio.nombre}</div>
                <div class="exercise-muscle">${musculoPrincipal}</div>
                ${musculosSecundarios ? `<div class="exercise-secondary-muscles">+ ${musculosSecundarios}</div>` : ''}
            </div>
            <div class="exercise-details">
                <div class="exercise-sets-reps">
                    <span class="sets-number">${ejercicio.series}</span>
                    <span class="sets-separator">×</span>
                    <span class="reps-number">${ejercicio.reps}</span>
                </div>
                <div class="exercise-meta">
                    <span class="meta-item rir">RIR ${ejercicio.rir}</span>
                    <span class="meta-item rest">${ejercicio.descanso_seg}s</span>
                </div>
            </div>
            <div class="exercise-tempo-row">
                <span class="tempo-label">Tempo:</span>
                <span class="tempo-value">${ejercicio.tempo}</span>
            </div>
            ${ejercicio.agarre ? `
                <div class="exercise-grip">
                    <span class="grip-icon">✋</span>
                    <span class="grip-label">Agarre:</span>
                    <span class="grip-value">${ejercicio.agarre.tipo}</span>
                    <span class="grip-width">(${ejercicio.agarre.apertura})</span>
                </div>
            ` : ''}
            ${ejercicio.altura_polea ? `
                <div class="exercise-cable-height">
                    <span class="cable-icon">⚙️</span>
                    <span class="cable-label">Polea:</span>
                    <span class="cable-value">${ejercicio.altura_polea}</span>
                </div>
            ` : ''}
            ${ejercicio.notas ? `
                <div class="exercise-notes" onclick="toggleNotes(this); event.stopPropagation();">
                    <span class="notes-icon">📝</span>
                    <span class="notes-text">${ejercicio.notas}</span>
                </div>
            ` : ''}
        </div>
    `;
}

function toggleRoutine(index) {
    const cards = document.querySelectorAll('.routine-card');
    cards[index].classList.toggle('expanded');
}

function toggleDay(routineIndex, dayIndex) {
    const routine = document.querySelectorAll('.routine-card')[routineIndex];
    const days = routine.querySelectorAll('.day-card');
    days[dayIndex].classList.toggle('expanded');
}

function toggleNotes(element) {
    element.classList.toggle('expanded');
}

document.addEventListener('DOMContentLoaded', loadRoutines);
