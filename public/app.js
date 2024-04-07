document.addEventListener('DOMContentLoaded', function () {
	//Get pages
	const mainPage = document.getElementById('main-page');
	const rulesPage = document.getElementById('auction-page');

	// Get elements
	const ageInput = document.getElementById('age');
	const phoneInput = document.getElementById('phone');
	const tShirtNumInput = document.getElementById('tshirtNumber');
	const dobInput = document.getElementById('dob');
	const registerBtn = document.getElementById('registerButton');
	const modal = document.querySelector('.modal');
	const modalHeader = document.querySelector('.modal-header');
	const modalContent = document.querySelector('.modal-content');
	const modalSubContent = document.querySelector('.modal-subcontent');
	const modalClosebtn = document.querySelector('.modal-close');
	const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
	const mobileMenu = document.getElementById('mobile-menu');
	const gotoTopBtn = document.querySelector('.go-to-top button');
	const backToMainPageBtn = document.getElementById('back-to-main-page-btn');
	const rulesPageNavigatorBtn = document.getElementById(
		'auction-rules-navigate'
	);
	const spinner = document.querySelector('.spinner');
	const registerText = document.getElementById('registerText');

	// Attach event listeners
	dobInput.addEventListener('blur', handleDobBlur);
	registerBtn.addEventListener('click', validateAndFetchData);
	modalClosebtn.addEventListener('click', handleModalClose);
	mobileMenuToggle.addEventListener('click', handleMenuToggle);
	gotoTopBtn.addEventListener('click', goToTop);
	ageInput.addEventListener('keydown', handleInput.bind(null, 'age'));
	phoneInput.addEventListener('keydown', handleInput.bind(null, 'phone'));
	tShirtNumInput.addEventListener(
		'keydown',
		handleInput.bind(null, 'tshirtNumber')
	);
	backToMainPageBtn.addEventListener('click', handleBackToMainPageBtnClick);
	rulesPageNavigatorBtn.addEventListener(
		'click',
		handleRulesPageNavigatorBtnClick
	);

	let app;
	let storage;
	let database;

	let formFields = [
		{ label: 'name', selector: 'name', type: 'input' },
		{ label: 'age', selector: 'age', type: 'input' },
		{ label: 'dob', selector: 'dob', type: 'input' },
		{ label: 'phone', selector: 'phone', type: 'input' },
		{ label: 'photo', selector: 'photo', type: 'file' },
		{ label: 'tshirtName', selector: 'tshirtName', type: 'input' },
		{ label: 'tshirtNumber', selector: 'tshirtNumber', type: 'input' },
		{ label: 'tshirtSize', selector: 'tshirtSize', type: 'select' },
		{
			label: 'skills',
			selector: 'input[name="skill"]',
			type: 'radio',
		},
		{ label: 'tId', selector: 'tId', type: 'input' },
		{ label: 'tPhoto', selector: 'tPhoto', type: 'file' },
	];
	let formElements = [];
	let formData = {};

	async function init() {
		fetchFirebaseConfig();
		fetchFormElements();
	}

	function fetchFirebaseConfig() {
		//TODO: get the firebase config here
		app = firebase.initializeApp(firebaseConfig);
		storage = firebase.storage();
		database = firebase.database(app);
	}

	function fetchFormElements() {
		for (let field of formFields) {
			if (field.type !== 'radio') {
				formElements.push({
					...field,
					element: document.getElementById(field.selector),
				});
			} else if (field.type === 'radio') {
				formElements.push({
					...field,
					element: document.querySelectorAll(field.selector),
				});
			}
		}
	}

	// Function to validate and fetch form data
	async function validateAndFetchData() {
		let message = 'Please fill in all fields';
		let emptyValuesError = false;
		let phoneLengthError = false;
		registerBtn.disabled = true;
		registerBtn.classList.add('disabled');
		registerText.classList.add('hidden');
		spinner.classList.remove('hidden');
		let isFormValid = true;
		resetFormValidity();
		formElements.forEach((item) => {
			if (item.type === 'radio') {
				item.element.forEach((element) => {
					if (element.checked) {
						item.inputValue = element.value;
						formData[item.label] = item.inputValue;
					}
				});
			} else if (item.type === 'file') {
				if (!item.element.files[0]) {
					isFormValid = false;
					setValidity(item.element, true);
					emptyValuesError = true;
				} else {
					item.inputValue = item.element.files[0];
					formData[item.label] = item.inputValue;
				}
			} else {
				if (!item.element.value) {
					isFormValid = false;
					setValidity(item.element, true);
					emptyValuesError = true;
				} else if (
					item.label === 'phone' &&
					item.element.value.length !== 10
				) {
					isFormValid = false;
					setValidity(item.element, true);
					phoneLengthError = true;
				} else {
					item.inputValue = item.element.value;
					formData[item.label] = item.inputValue;
				}
			}
		});

		if (!isFormValid) {
			if (emptyValuesError && phoneLengthError) {
				message += ' and please enter 10 digit phone number.';
			} else if (phoneLengthError) {
				message = 'Please enter 10 digit phone number.';
			}
			handleInvalidForm(message);
			return;
		}
		formData.registrationId = generateRegistrationId();
		await uploadPhotos();
		console.log(formData);
		await postDataToFireBase();
	}

	function handleInvalidForm(message) {
		alert(message);
		registerBtn.disabled = false;
		registerBtn.classList.remove('disabled');
		registerText.classList.remove('hidden');
		spinner.classList.add('hidden');
	}

	function uploadPhotos() {
		return new Promise((resolve, reject) => {
			Promise.all([uploadPlayersPhoto(), uploadTransactionPhoto()])
				.then((urls) => {
					// Both photos are uploaded successfully and URLs are retrieved
					const playersPhotoURL = urls[0];
					const transactionPhotoURL = urls[1];
					formData.photo = playersPhotoURL;
					formData.tPhoto = transactionPhotoURL;
					resolve();
				})
				.catch((error) => {
					// Handle errors if any of the uploads fail
					console.error('Error uploading photos:', error);
					reject();
				});
		});
	}

	function uploadPlayersPhoto() {
		const ref = storage.ref();
		const file = formData.photo;
		const name = `player-${formData.registrationId}`;
		const metadata = {
			contentType: file.type,
		};
		const task = ref.child('PlayersPhotos').child(name).put(file);
		return task.then((snapshot) => snapshot.ref.getDownloadURL());
	}

	function uploadTransactionPhoto() {
		const ref = storage.ref();
		const file = formData.tPhoto;
		const name = `transaction-${formData.registrationId}`;
		const metadata = {
			contentType: file.type,
		};
		const task = ref.child('TransactionsPhotos').child(name).put(file);
		return task.then((snapshot) => snapshot.ref.getDownloadURL());
	}

	async function postDataToFireBase() {
		// Path to the location where you want to save the data
		const dataRef = database.ref('Players/');
		// Push the data to the database
		dataRef
			.push(formData)
			.then(() => {
				handleSuccess();
			})
			.catch(() => {
				handleError();
			});
		registerBtn.disabled = false;
		registerBtn.classList.remove('disabled');
		registerText.classList.remove('hidden');
		spinner.classList.add('hidden');
	}

	function handleSuccess() {
		resetModalClass();
		modalHeader.classList.add('text-indigo-600');
		modalHeader.textContent = 'Success!!!';
		modalContent.textContent = `Your registration ID is: ${formData.registrationId}`;
		modalSubContent.textContent =
			'Please note down your registartion ID for future use.';
	}

	function handleError() {
		resetModalClass();
		modalHeader.classList.add('text-red-600');
		modalHeader.textContent = 'Something went wrong!!!';
		modalContent.textContent = `Please try again.`;
	}

	function resetModalClass() {
		modal.classList.remove('hidden');
		modalHeader.classList.remove('text-indigo-600');
		modalHeader.classList.remove('text-red-600');
	}

	function handleModalClose() {
		formElements.forEach((item) => {
			item.element.value = item.type === 'radio' ? 'Batsman' : '';
		});
		formElements = [];
		init();
		modal.classList.add('hidden');
	}

	function setValidity(element, validity) {
		if (validity) element.classList.add('border-red-300');
		else element.classList.remove('border-red-300');
	}

	function resetFormValidity() {
		formElements.forEach((item) => {
			if (item.type !== 'radio') setValidity(item.element, false);
		});
	}

	function generateRegistrationId() {
		return `MPL-2024${Math.random()
			.toString(36)
			.substring(2, 11)
			.toUpperCase()}`;
	}

	function handleMenuToggle() {
		const expanded =
			mobileMenuToggle.getAttribute('aria-expanded') === 'true' || false;
		mobileMenuToggle.setAttribute('aria-expanded', !expanded);
		mobileMenu.classList.toggle('hidden');
	}

	function handleInput(source, event) {
		const limit = source === 'phone' ? 10 : 2;
		if (
			(!(event.key >= '0' && event.key <= '9') && // Not a number
				event.key !== 'Backspace') || // Not backspace
			(event.target.value.length >= limit && event.key !== 'Backspace') // Exceeds limit
		) {
			event.preventDefault();
		}
	}

	function handleBackToMainPageBtnClick() {
		rulesPage.classList.add('hidden');
		mainPage.classList.remove('hidden');
	}

	function handleRulesPageNavigatorBtnClick() {
		mainPage.classList.add('hidden');
		rulesPage.classList.remove('hidden');
	}

	function handleDobBlur(event) {
		const { value: dob } = event.target;
		if (dob) {
			const age = calculateAge(dob);
			ageInput.value = age;
		}
	}

	function calculateAge(birthDateString) {
		// Create a Date object from the birth date string
		const birthDate = new Date(birthDateString);

		// Get the current date
		const currentDate = new Date();

		// Calculate the difference in years between the current date and the birth date
		let age = currentDate.getFullYear() - birthDate.getFullYear();

		// Adjust for the difference in months and days
		const currentMonth = currentDate.getMonth() + 1; // January is 0
		const birthMonth = birthDate.getMonth() + 1;
		if (
			currentMonth < birthMonth ||
			(currentMonth === birthMonth &&
				currentDate.getDate() < birthDate.getDate())
		) {
			age--; // Subtract 1 year if current month and day are before birth month and day
		}

		return age;
	}

	function goToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	}

	init();
});
