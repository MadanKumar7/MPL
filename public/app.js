document.addEventListener('DOMContentLoaded', function () {
	//Get pages
	const mainPage = document.getElementById('main-page');
	const rulesPage = document.getElementById('auction-page');

	// Get elements
	const ageInput = document.getElementById('age');
	const phoneInput = document.getElementById('phone');
	const tShirtNumInput = document.getElementById('tshirtNumber');
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

	// Attach event listeners

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
		{
			label: 'skills',
			selector: 'input[name="skill"]:checked',
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
		// TODO: get firebase config here from firebase project settings
		app = firebase.initializeApp(firebaseConfig);
		storage = firebase.storage();
		database = firebase.database(app);
	}

	function fetchFormElements() {
		for (let field of formFields) {
			if (field.type === 'input' || field.type === 'file') {
				formElements.push({
					...field,
					element: document.getElementById(field.selector),
				});
			} else if (field.type === 'radio') {
				formElements.push({
					...field,
					element: document.querySelector(field.selector),
				});
			}
		}
	}

	// Function to validate and fetch form data
	async function validateAndFetchData() {
		registerBtn.disabled = true;
		registerBtn.classList.add('disabled');
		let isFormValid = true;
		resetFormValidity();
		formElements.forEach((item) => {
			if (item.type === 'input' || item.type === 'radio') {
				if (!item.element.value) {
					isFormValid = false;
					setValidity(item.element, true);
				} else {
					item.inputValue = item.element.value;
					formData[item.label] = item.inputValue;
				}
			} else if (item.type === 'file') {
				if (!item.element.files[0]) {
					isFormValid = false;
					setValidity(item.element, true);
				} else {
					item.inputValue = item.element.files[0];
					formData[item.label] = item.inputValue;
				}
			}
		});

		if (!isFormValid) {
			alert('Please fill in all fields and select an option for skills.');
			return;
		}
		formData.registrationId = generateRegistrationId();
		await uploadPhotos();
		console.log(formData);
		await postDataToFireBase();
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
			setValidity(item.element, false);
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

	function goToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	}

	init();
});
