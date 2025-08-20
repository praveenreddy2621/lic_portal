// =============================================
// UNIFIED MASTER SCRIPT (Final, Complete Version with Admin Link)
// This single file controls index.html, plans.html, about.html, and services.html
// =============================================

let LIC_PLANS = [];
let planModal, modalPlanName, modalPlanDesc, calculateBtn, closeModalBtn, resultsDiv, planForm, modalContactDiv, currentPlan;

// --- Main Initializer ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch all policy data from the server as soon as any page loads
    await fetchPolicies();
    await fetchPolicies();
    await loadFooter();
    
    // 2. Define global variables for DOM elements that might exist on the page
    planModal = document.getElementById('planModal');
    modalPlanName = document.getElementById('modalPlanName');
    modalPlanDesc = document.getElementById('modalPlanDesc');
    calculateBtn = document.getElementById('calculateBtn');
    closeModalBtn = document.querySelector('.close');
    resultsDiv = document.getElementById('calculationResults');
    planForm = document.getElementById('planForm');
    modalContactDiv = document.getElementById('modalContact');
    
    // 3. Run specific setup functions based on which page is currently loaded
    if (document.getElementById('allPlans')) {
        initializeHomePage();
    }
    if (document.getElementById('eligiblePlans')) {
        initializePlansPage();
    }
    if (document.getElementById('insuranceForm')) {
        initializeAboutPage();
    }

    // 4. Run universal features that apply to all pages
    setupAuthLink(); // Manages the Welcome message and Login/Logout button
    
    // Universal event listeners for the calculator modal
    if(closeModalBtn) closeModalBtn.addEventListener('click', () => planModal.style.display='none');
    if(calculateBtn) calculateBtn.addEventListener('click', calculatePremium);
    window.addEventListener('click', (e) => { if(e.target === planModal) planModal.style.display='none';});
    if (document.getElementById('modalContactBtn')) {
        document.getElementById('modalContactBtn').addEventListener('click', () => contactAgentFromModal(currentPlan ? currentPlan.name : ""));
    }
});

async function loadFooter() {
    try {
        const response = await fetch('footer.html');
        const footerHTML = await response.text();
        const footerElement = document.querySelector('footer');
        if (footerElement) {
            footerElement.innerHTML = footerHTML;
            // Attach event listener for the new form in the footer
            const footerForm = document.getElementById('footerContactForm');
            if (footerForm) {
                footerForm.addEventListener('submit', handleFooterContact);
            }
        }
    } catch (error) {
        console.error("Failed to load footer:", error);
    }
}

function handleFooterContact(e) {
    e.preventDefault();
    const email = document.getElementById('footer-email').value;
    const message = document.getElementById('footer-message').value;
    const fullMessage = `*New Footer Contact Form Submission*\n\n*Email:* ${email}\n*Message:* ${message}`;
    const encodedMessage = encodeURIComponent(fullMessage);
    const agentNumber = "917095394483"; // Your WhatsApp number
    window.open(`https://wa.me/${agentNumber}?text=${encodedMessage}`, "_blank");
    alert("Thank you for your message! Please confirm sending it in WhatsApp.");
    e.target.reset();
}


// Fetches the master list of policies from our backend server
async function fetchPolicies() {
    try {
        const response = await fetch('/api/policies');
        LIC_PLANS = await response.json();
    } catch (error) {
        console.error("Failed to fetch policies:", error);
    }
}

// ========================================================
// THIS IS THE UPDATED FUNCTION
// It now checks the user's role and adds a link for admins.
// ========================================================
async function setupAuthLink() {
    const authLinkEl = document.getElementById('auth-link');
    const welcomeEl = document.getElementById('welcome-message');
    const token = localStorage.getItem('token');

    if (token && authLinkEl && welcomeEl) {
        try {
            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const user = await response.json();
                
                // --- THIS IS THE NEW LOGIC ---
                // Check the user's role to decide what to display
                if (user.role === 'admin') {
                    // If user is an admin, make the welcome message a link to the dashboard
                    welcomeEl.innerHTML = `<a href="admin.html" style="color: var(--secondary-color); text-decoration: none;">Welcome, ${user.username}! (Admin)</a>`;
                } else {
                    // If user is a regular user, display plain text
                    welcomeEl.innerHTML = `<span style="color: var(--secondary-color);">Welcome, ${user.username}!</span>`;
                }
                // --- END OF NEW LOGIC ---

                // Display the Logout button for all logged-in users
                authLinkEl.innerHTML = `<a href="#" id="logout-btn">Logout</a>`;
                document.getElementById('logout-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                });
            } else {
                // Token is invalid, log the user out
                localStorage.removeItem('token');
                authLinkEl.innerHTML = `<a href="login.html">Login</a>`;
                welcomeEl.innerHTML = '';
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            authLinkEl.innerHTML = `<a href="login.html">Login</a>`;
            welcomeEl.innerHTML = '';
        }
    } else if (authLinkEl) {
        // User is not logged in, show Login button
        authLinkEl.innerHTML = `<a href="login.html">Login</a>`;
        if (welcomeEl) welcomeEl.innerHTML = '';
    }
}
// ========================================================


// --- PAGE-SPECIFIC SETUP FUNCTIONS ---

// Sets up the homepage (index.html)
function initializeHomePage() {
    const allPlansDiv = document.getElementById('allPlans');
    if (allPlansDiv) {
        allPlansDiv.innerHTML = '';
        if (LIC_PLANS.length > 0) {
            LIC_PLANS.forEach(plan => allPlansDiv.appendChild(createPlanCard(plan)));
        } else {
            allPlansDiv.innerHTML = "<p>Could not load plans. Please check the server connection.</p>";
        }
    }
    
    // Initialize the quote slider
    const quotes = document.querySelectorAll('.quote-slide p');
    if (quotes.length > 0) {
        let currentQuoteIndex = 0;
        quotes[currentQuoteIndex].classList.add('active');
        setInterval(() => {
            quotes[currentQuoteIndex].classList.remove('active');
            currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
            quotes[currentQuoteIndex].classList.add('active');
        }, 5000);
    }
}

// Sets up the plans page (plans.html)
function initializePlansPage() {
    const checkBtn = document.getElementById('checkEligibilityBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', showEligiblePlans);
    }
}

// Sets up the about page (about.html)
function initializeAboutPage() {
    const planDropdown = document.getElementById('plan');
    const insuranceForm = document.getElementById('insuranceForm');

    if (planDropdown && LIC_PLANS.length > 0) {
        LIC_PLANS.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.name;
            option.textContent = plan.name;
            planDropdown.appendChild(option);
        });
    }

    if (insuranceForm) {
        insuranceForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const name = document.getElementById("name").value;
            const age = document.getElementById("age").value;
            const email = document.getElementById("email").value;
            const phone = document.getElementById("phone").value;
            const plan = document.getElementById("plan").value;
            const sumAssured = document.getElementById("sumAssured").value;
            const term = document.getElementById("term").value;
            const message = `*New Insurance Application*\n\n*Name:* ${name}\n*Age:* ${age}\n*Email:* ${email}\n*Phone:* ${phone}\n*Plan Interested In:* ${plan}\n*Sum Assured:* ₹${parseInt(sumAssured).toLocaleString('en-IN')}\n*Policy Term:* ${term} years`;
            const encodedMessage = encodeURIComponent(message);
            const agentNumber = "917095394483";
            window.open(`https://wa.me/${agentNumber}?text=${encodedMessage}`, "_blank");
            alert("Thank you! Your application details have been prepared. Please confirm in WhatsApp.");
            this.reset();
        });
    }
}


// --- CORE FUNCTIONALITY ---

// Filters and displays plans based on age on the plans page
function showEligiblePlans() {
    const ageInput = document.getElementById('userAgeCheck');
    const eligiblePlansDiv = document.getElementById('eligiblePlans');
    const age = parseInt(ageInput.value);
    
    eligiblePlansDiv.innerHTML = "";
    if (!age || age < 0 || age > 100) {
        eligiblePlansDiv.innerHTML = `<p style="color: red; text-align: center;">Please enter a valid age.</p>`;
        return;
    }
    const eligiblePlans = LIC_PLANS.filter(plan => age >= plan.minAge && age <= plan.maxAge);
    if (eligiblePlans.length === 0) {
        eligiblePlansDiv.innerHTML = `<p style="text-align: center;">No plans available for the entered age.</p>`;
        return;
    }
    eligiblePlans.forEach(plan => eligiblePlansDiv.appendChild(createPlanCard(plan)));
}

// Creates the HTML for a single policy card
function createPlanCard(plan) {
    const card = document.createElement('div');
    card.className = 'plan-card';
    const buttonText = plan.rateTable ? "View & Calculate" : "View Details";
    const bonusFeature = plan.bonus ? `<p><strong>Bonus:</strong> ${plan.bonus}</p>` : '';
    
    card.innerHTML = `
        <div class="plan-header"><h3>${plan.name}</h3></div>
        <div class="plan-body">
            <p>${plan.description}</p>
            ${bonusFeature}
        </div>
        <div class="plan-button"><button class="btn premium-btn">${buttonText}</button></div>
    `;
    card.querySelector('.premium-btn').addEventListener('click', () => openPlanModal(plan));
    return card;
}

// Opens and populates the calculator modal
function openPlanModal(plan){
    currentPlan = plan;
    modalPlanName.textContent = plan.name;
    modalPlanDesc.textContent = plan.description;
    
    if (plan.rateTable) {
        planForm.style.display = 'block';
        if(modalContactDiv) modalContactDiv.style.display = 'none';
        const termDropdown = document.getElementById('planTerm');
        termDropdown.innerHTML = '<option value="" disabled selected>Select a Term</option>';
        for (let i = 5; i <= 25; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} Years`;
            termDropdown.appendChild(option);
        }
    } else {
        planForm.style.display = 'none';
        if(modalContactDiv) modalContactDiv.style.display = 'block';
    }
    
    planForm.reset();
    if(resultsDiv) resultsDiv.style.display = 'none';
    if(planModal) planModal.style.display = 'block';
}

// The main premium calculation logic
function calculatePremium() {
    if (!currentPlan || !currentPlan.rateTable) {
        alert("Calculation is not available for this plan.");
        return;
    }
    const userName = document.getElementById('userName').value;
    const age = parseInt(document.getElementById('userAgeForm').value);
    const term = parseInt(document.getElementById('planTerm').value);
    const ppt = parseInt(document.getElementById('ppt').value);
    const basicSumAssured = parseFloat(document.getElementById('sumAssured').value);

    if (!userName || isNaN(age) || isNaN(term) || isNaN(ppt) || isNaN(basicSumAssured)) {
        alert("Please fill all required fields correctly.");
        return;
    }
    if (ppt > term) {
        alert("Premium Paying Term (PPT) cannot be greater than the Policy Term.");
        return;
    }
    if (basicSumAssured < 200000) {
        alert("The minimum Sum Assured for this policy is ₹2,00,000.");
        return;
    }
    const availableTerms = Object.keys(currentPlan.rateTable).map(Number);
    let finalTermToUse = term;
    let termWasApproximated = false;
    if (!availableTerms.includes(term)) {
        termWasApproximated = true;
        finalTermToUse = availableTerms.reduce((prev, curr) => (Math.abs(curr - term) < Math.abs(prev - term) ? curr : prev));
    }
    const ratePer1000 = currentPlan.rateTable[finalTermToUse.toString()];
    const deathSumAssured = basicSumAssured * 1.25;
    const basePremium = (basicSumAssured / 1000) * ratePer1000;
    const halflyFactor = 0.51, quarterlyFactor = 0.26, monthlyFactor = 0.088;
    const taxAmount1 = basePremium * 0.045;
    const yearly1 = basePremium + taxAmount1;
    const halfly1 = (basePremium * halflyFactor) * 1.045;
    const quarterly1 = (basePremium * quarterlyFactor) * 1.045;
    const monthly1 = (basePremium * monthlyFactor) * 1.045;
    const daily1 = yearly1 / 365;
    const taxAmount2 = basePremium * 0.0225;
    const yearly2 = basePremium + taxAmount2;
    const halfly2 = (basePremium * halflyFactor) * 1.0225;
    const quarterly2 = (basePremium * quarterlyFactor) * 1.0225;
    const monthly2 = (basePremium * monthlyFactor) * 1.0225;
    const daily2 = yearly2 / 365;
    let approximationNote = termWasApproximated ? `<p class="disclaimer" style="color: #856404; background-color: #fff3cd;">Note: Premium is estimated using the closest available term (${finalTermToUse} years).</p>` : '';
    resultsDiv.innerHTML = `<h3>Result for: ${currentPlan.name}</h3>${approximationNote}<div class="results-details"><div class="detail-row"><span>Name :</span> <span>${userName}</span></div><div class="detail-row"><span>Age :</span> <span>${age}</span></div><div class="detail-row"><span>Selected Term :</span> <span>${term} Years</span></div><div class="detail-row"><span>P.P.T. :</span> <span>${ppt} Years</span></div><div class="detail-row"><span>Death Sum Assured :</span> <span>₹${deathSumAssured.toLocaleString('en-IN')}</span></div><div class="detail-row"><span>Basic Sum Assured :</span> <span>₹${basicSumAssured.toLocaleString('en-IN')}</span></div></div><div class="premium-section"><h4>1st year Premium With TAX 4.5% :</h4><div class="premium-row"><span class="label">Yearly :</span><span class="total">₹${yearly1.toFixed(0)}</span></div><div class="premium-row"><span class="label">Halfly :</span><span class="total">₹${halfly1.toFixed(0)}</span></div><div class="premium-row"><span class="label">Quarterly :</span><span class="total">₹${quarterly1.toFixed(0)}</span></div><div class="premium-row"><span class="label">Monthly(ECS) :</span><span class="total">₹${monthly1.toFixed(0)}</span></div><div class="premium-row"><span class="label">Avg Prem/Day :</span><span class="total">₹${daily1.toFixed(0)}</span></div></div><div class="premium-section"><h4>After 1st year Premium With TAX 2.25% :</h4><div class="premium-row"><span class="label">Yearly :</span><span class="total">₹${yearly2.toFixed(0)}</span></div><div class="premium-row"><span class="label">Halfly :</span><span class="total">₹${halfly2.toFixed(0)}</span></div><div class="premium-row"><span class="label">Quarterly :</span><span class="total">₹${quarterly2.toFixed(0)}</span></div><div class="premium-row"><span class="label">Monthly(ECS) :</span><span class="total">₹${monthly2.toFixed(0)}</span></div><div class="premium-row"><span class="label">Avg Prem/Day :</span><span class="total">₹${daily2.toFixed(0)}</span></div></div><p class="disclaimer">Premium Shown Above is Indicative and not Exact.</p><div style="text-align:center; margin-top:20px;"><button id="whatsappBtn" class="btn">Chat with Us</button></div>`;
    resultsDiv.style.display = 'block';
    document.getElementById('whatsappBtn').addEventListener('click', contactAgentWithDetails);
}

// --- CONTACT FUNCTIONS ---

function contactAgentWithDetails() {
    const agentPhoneNumber = '917095394483';
    const userName = document.getElementById('userName').value;
    const age = document.getElementById('userAgeForm').value;
    const term = document.getElementById('planTerm').value;
    const ppt = document.getElementById('ppt').value;
    const sumAssured = document.getElementById('sumAssured').value;
    const message = `Hello, I am interested in the *${currentPlan.name}* plan.\nMy Details:\n- Name: ${userName}\n- Age: ${age}\n- Term: ${term} years\n- PPT: ${ppt} years\n- Sum Assured: ₹${parseInt(sumAssured).toLocaleString('en-IN')}\n\nPlease provide me with more information.`;
    const encodedMessage = encodeURIComponent(message.trim());
    const whatsappUrl = `https://wa.me/${agentPhoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

function contactAgentFromModal(planName) {
    const agentPhoneNumber = '917095394483';
    const message = `Hi, I am interested in learning more about the *${planName}* plan. Please provide me with details. Thank you.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${agentPhoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}