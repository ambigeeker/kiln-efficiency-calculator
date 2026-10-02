let chartInstance = null;

// Thermodynamic Constants
const CP_WATER = 0.004186; // Specific heat capacity of water, MJ/(kg·°C)
const H_FG = 2.26;         // Latent heat of vaporization of water, MJ/kg

function calculateSuite() {
    const Wi = parseFloat(document.getElementById('initial_weight').value);
    const MCi = parseFloat(document.getElementById('mc_initial').value);
    const MCf = parseFloat(document.getElementById('mc_target').value);
    const dryingTime = parseFloat(document.getElementById('drying_time').value);
    const chamberTemp = parseFloat(document.getElementById('chamber_temp').value);
    const ambientTemp = parseFloat(document.getElementById('ambient_temp').value);
    const fuelUsed = parseFloat(document.getElementById('fuel_used').value);
    const fuelPrice = parseFloat(document.getElementById('fuel_price').value);

    const fuelSelect = document.getElementById('fuel_type');
    const lhv = parseFloat(fuelSelect.options[fuelSelect.selectedIndex].getAttribute('data-lhv'));

    // Input Validation
    if (MCf >= MCi) {
        alert('Validation error: Target final moisture (MCf) must be strictly lower than initial moisture (MCi).');
        return;
    }
    if (Wi <= 0 || dryingTime <= 0 || fuelUsed <= 0) {
        alert('Validation error: Mass, duration, and fuel quantity must be positive.');
        return;
    }

    // 1. Mass Balance & Bone-Dry Solids Conservation
    // Dry Solids (W_dry) = Wi * (1 - MCi/100)
    // Final Weight (Wf)  = W_dry / (1 - MCf/100)
    const drySolids = Wi * (1 - (MCi / 100));
    const Wf = drySolids / (1 - (MCf / 100));
    const waterRemoved = Wi - Wf;
    const dryingRate = waterRemoved / dryingTime;

    // Dry-basis moisture content: MC_db = MC_wb / (100 - MC_wb) * 100
    const mcDryBasis = (MCf / (100 - MCf)) * 100;

    // 2. Thermodynamic Heat Balance
    // Sensible heating of moisture to chamber temp + latent heat of vaporization
    const deltaT = Math.max(chamberTemp - ambientTemp, 0);
    const qEvaporation = waterRemoved * ((CP_WATER * deltaT) + H_FG);
    const energyInput = fuelUsed * lhv; // Total MJ released

    const sec = energyInput / waterRemoved; // MJ/kg water
    const thermalEfficiency = Math.min((qEvaporation / energyInput) * 100, 100);

    // 3. Process Economics
    const totalFuelCost = fuelUsed * fuelPrice;
    const costPerKgDry = totalFuelCost / Wf;

    // 4. Quality & Shelf-Life Compliance Badge
    const complianceCard = document.getElementById('compliance_card');
    const badge = document.getElementById('val_compliance_badge');
    const desc = document.getElementById('val_compliance_desc');

    if (MCf <= 12.0) {
        badge.innerHTML = '🟢 Stable Storage Compliant';
        badge.style.color = '#4ade80';
        desc.innerText = `${MCf}% w.b.: Low water activity, mold inhibited under ambient storage.`;
    } else if (MCf <= 16.0) {
        badge.innerHTML = '🟡 Intermediate Moisture Product';
        badge.style.color = '#facc15';
        desc.innerText = `${MCf}% w.b.: Suitable for short-term distribution or requires cold chain.`;
    } else if (MCf > 16.0) {
        badge.innerHTML = '🔴 Spoilage Risk (High Moisture)';
        badge.style.color = '#f87171';
        desc.innerText = `${MCf}% w.b.: Microbial activity and rapid mold growth likely.`;
    }

    if (MCf < 7.0) {
        badge.innerHTML = '⚪ Over-Dried Product';
        badge.style.color = '#cbd5e1';
        desc.innerText = `${MCf}% w.b.: High case hardening and friability/breakage risk.`;
    }

    // 5. Update KPI Cards in DOM
    document.getElementById('val_final_weight').innerHTML = `${Wf.toFixed(1)} <small>kg</small>`;
    document.getElementById('val_water_removed').innerText = `${waterRemoved.toFixed(1)} kg water evaporated (${((waterRemoved / Wi) * 100).toFixed(0)}% loss)`;
    document.getElementById('val_drying_rate').innerHTML = `${dryingRate.toFixed(2)} <small>kg/h</small>`;
    document.getElementById('val_dry_basis').innerText = `Dry Basis: ${mcDryBasis.toFixed(1)}% d.b.`;
    document.getElementById('val_efficiency').innerHTML = `${thermalEfficiency.toFixed(1)} <small>%</small>`;
    document.getElementById('val_sec').innerText = `SEC: ${sec.toFixed(2)} MJ/kg H₂O`;
    document.getElementById('val_unit_energy_cost').innerHTML = `${costPerKgDry.toFixed(2)} <small>/kg yield</small>`;
    document.getElementById('val_total_fuel_cost').innerText = `Total Fuel Cost: ${totalFuelCost.toLocaleString()}`;

    // 6. Dual-Axis Visual Chart Simulation
    renderDualAxisChart(Wi, Wf, MCi, MCf, drySolids, dryingTime);
}

function renderDualAxisChart(Wi, Wf, MCi, MCf, drySolids, totalHours) {
    const labels = [];
    const massData = [];
    const mcData = [];
    const steps = 10;
    const dt = totalHours / steps;
    const k = 3.0 / totalHours; // Decay constant matching end boundaries

    for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        labels.push(`${t.toFixed(1)}h`);

        // Simulated mass trajectory via thin-layer decay
        const currentMass = Wf + (Wi - Wf) * Math.exp(-k * t);
        massData.push(currentMass.toFixed(2));

        // Moisture content (% wet basis) calculated from solid conservation
        const currentMC = ((currentMass - drySolids) / currentMass) * 100;
        mcData.push(Math.max(currentMC, MCf).toFixed(1));
    }

    const ctx = document.getElementById('dryingChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Batch Mass (kg)',
                    data: massData,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    yAxisID: 'y',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    fill: false
                },
                {
                    label: 'Moisture Content (% w.b.)',
                    data: mcData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    yAxisID: 'y1',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#334155' },
                    ticks: { color: '#38bdf8' },
                    title: { display: true, text: 'Mass (kg)', color: '#38bdf8' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#f59e0b' },
                    title: { display: true, text: 'Moisture (% w.b.)', color: '#f59e0b' }
                }
            }
        }
    });
}

// Fuel Unit Dynamic Label Updater
document.getElementById('fuel_type').addEventListener('change', function () {
    const unit = this.options[this.selectedIndex].getAttribute('data-unit');
    document.getElementById('lbl_fuel_used').innerText = `Fuel Consumed (${unit})`;
    document.getElementById('lbl_fuel_price').innerText = `Fuel Unit Cost (Cost/${unit})`;
});

document.getElementById('calc_form').addEventListener('submit', function (e) {
    e.preventDefault();
    calculateSuite();
});

// Run once on load
document.addEventListener('DOMContentLoaded', calculateSuite);