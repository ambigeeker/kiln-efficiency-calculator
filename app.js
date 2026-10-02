let chartInstance = null;

// Thermodynamic Constants
const CP_WATER = 0.004186; // Specific heat of water, MJ/(kg·°C)
const H_FG = 2.26;         // Latent heat of vaporization of water at 100°C, MJ/kg
const AMBIENT_TEMP = 28;   // Base reference ambient temperature, °C

function calculateMetrics() {
    const Wi = parseFloat(document.getElementById('initial_weight').value);
    const Wf = parseFloat(document.getElementById('final_weight').value);
    const dryingTime = parseFloat(document.getElementById('drying_time').value);
    const chamberTemp = parseFloat(document.getElementById('chamber_temp').value);
    const fuelUsed = parseFloat(document.getElementById('fuel_used').value);
    
    const fuelSelect = document.getElementById('fuel_type');
    const lhv = parseFloat(fuelSelect.options[fuelSelect.selectedIndex].getAttribute('data-lhv'));

    if (Wf >= Wi || dryingTime <= 0 || fuelUsed <= 0) {
        alert('Validation error: Initial mass must exceed final dry mass, and time/fuel must be positive.');
        return;
    }

    // 1. Mass Balance
    const waterRemoved = Wi - Wf;
    const yieldLoss = ((waterRemoved / Wi) * 100).toFixed(1);
    const dryingRate = (waterRemoved / dryingTime).toFixed(2);

    // 2. Thermal Energy Input
    const energyInput = fuelUsed * lhv; // Total MJ released by fuel

    // 3. Theoretical Heat for Moisture Evaporation
    // Q_w = m_w * [Cp * (T_chamber - T_ambient) + h_fg]
    const deltaT = Math.max(chamberTemp - AMBIENT_TEMP, 0);
    const qEvaporation = waterRemoved * ((CP_WATER * deltaT) + H_FG);

    // 4. Specific Energy Consumption & Thermal Efficiency
    const sec = (energyInput / waterRemoved).toFixed(2); // MJ/kg water
    const thermalEfficiency = Math.min(((qEvaporation / energyInput) * 100), 100).toFixed(1);

    // Update UI DOM
    document.getElementById('val_water_removed').innerHTML = `${waterRemoved.toFixed(1)} <small>kg</small>`;
    document.getElementById('val_yield_loss').innerText = `${yieldLoss}% total mass removed`;
    document.getElementById('val_drying_rate').innerHTML = `${dryingRate} <small>kg/h</small>`;
    document.getElementById('val_sec').innerHTML = `${sec} <small>MJ/kg</small>`;
    document.getElementById('val_efficiency').innerHTML = `${thermalEfficiency} <small>%</small>`;

    let rating = 'Standard Industrial';
    if (thermalEfficiency > 40) rating = 'High Thermal Retention';
    if (thermalEfficiency < 15) rating = 'Elevated Heat Loss / Low Draft';
    document.getElementById('val_eval_text').innerText = rating;

    // Render Decay Simulation Curve
    renderChart(Wi, Wf, dryingTime);
}

function renderChart(Wi, Wf, totalHours) {
    const labels = [];
    const massData = [];
    const intervals = 8;
    const dt = totalHours / intervals;

    // Thin-layer drying exponential curve approximation: W(t) = Wf + (Wi - Wf) * exp(-k * t)
    const k = 3.0 / totalHours; // Decay constant matching end boundaries

    for (let i = 0; i <= intervals; i++) {
        const t = (i * dt);
        labels.push(`${t.toFixed(1)}h`);
        const currentMass = Wf + (Wi - Wf) * Math.exp(-k * t);
        massData.push(currentMass.toFixed(2));
    }

    const ctx = document.getElementById('dryingChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Batch Mass Trajectory (kg)',
                data: massData,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#0284c7',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Mass (kg)', color: '#94a3b8' }
                }
            }
        }
    });
}

document.getElementById('calc_form').addEventListener('submit', function (e) {
    e.preventDefault();
    calculateMetrics();
});

// Run once on load to show initial baseline
document.addEventListener('DOMContentLoaded', calculateMetrics);