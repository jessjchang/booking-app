document.addEventListener('DOMContentLoaded', () => {
  let scheduleButton = document.querySelector('#schedule-button');
  let scheduleDisplayArea = document.querySelector('#schedules');
  let addStaffForm = document.querySelector('#add-staff-form');
  let addSchedulesButton = document.querySelector('#add-schedule-button');
  let addScheduleForm = document.querySelector('#add-schedule-form');
  let firstSchedule = document.querySelector('#schedule-1');
  let firstSelector = firstSchedule.querySelector('.staff-name').querySelector('select');
  let nextScheduleNum = 1;
  let bookScheduleArea = document.querySelector('#book-schedule');
  let bookScheduleForm = document.querySelector('#book-schedule-form');
  let availableScheduleSelector = bookScheduleForm.querySelector('#select-schedule-dropdown');
  let populateAvailableSchedulesButton = document.querySelector('#populate-available-schedules');
  let addStudentForm = document.querySelector('#new-student-area');
  let bookingDatesList = document.querySelector('#booking-dates');
  let deleteScheduleForm = document.querySelector('#delete-schedule-form');
  let cancelBookingForm = document.querySelector('#cancel-booking-form'); 

  populateStaffSelector(firstSelector);
  displayAllBookings();
  populateAllSchedulesToDelete();
  populateAllBookings();

  scheduleButton.addEventListener('click', () => {
    displayAllSchedules('');
    retrieveAllSchedules()
  });

  addStaffForm.addEventListener('submit', event => {
    event.preventDefault();
    addStaff();
  });

  addSchedulesButton.addEventListener('click', () => {
    createAddScheduleTemplate();
  });

  addScheduleForm.addEventListener('submit', event => {
    event.preventDefault();
    submitNewSchedule();
  });

  populateAvailableSchedulesButton.addEventListener('click', () => {
    populateAvailableSchedules();
  });

  bookScheduleForm.addEventListener('submit', event => {
    event.preventDefault();
    bookSchedule().catch(bookingSequence => {
      loadNewStudentForm();
      return addNewStudent();
    });
  });

  addStudentForm.addEventListener('submit', event => {
    event.preventDefault();
    submitStudent();
  });

  bookingDatesList.addEventListener('click', event => {
    if (event.target.className === 'booking-date') {
      displayBookingInfo(event);
    }
  });

  deleteScheduleForm.addEventListener('submit', event => {
    event.preventDefault();
    completeScheduleDeletion();
  });

  cancelBookingForm.addEventListener('submit', event => {
    event.preventDefault();
    completeBookingCancellation();
  });

  function displayAllSchedules(message) {
    if (Array.isArray(message)) {
      let scheduleList = document.createElement('ul');

      message.forEach(([staff, count]) => {
        let li = document.createElement('li');
        li.textContent = `${staff}: ${count}`;
        scheduleList.appendChild(li);
      });

      scheduleDisplayArea.appendChild(scheduleList);
    } else {
      let p = document.createElement('p');
      p.textContent = message;
      scheduleDisplayArea.appendChild(p);
    }
  }

  function retrieveAllSchedules() {
    let request = new XMLHttpRequest();
    request.open('GET', 'http://localhost:3000/api/schedules');
    request.timeout = 5000;
    request.responseType = 'json';
  
    request.addEventListener('load', event => {
      let schedules = request.response;
      
      if (schedules.length > 0) {
        let scheduleCount = {};

        schedules.forEach(schedule => {
          let staffID = schedule['staff_id'];
          let key = `staff ${String(staffID)}`;
          if (Object.keys(scheduleCount).includes(key)) {
            scheduleCount[key] += 1;
          } else {
            scheduleCount[key] = 1;
          }
        });

        scheduleCount = Object.entries(scheduleCount);

        displayAllSchedules(scheduleCount);
      } else {
        displayAllSchedules('There are currently no schedules available for booking.');
      }
    });

    request.addEventListener('timeout', () => {
      request.abort();
      displayAllSchedules('There are too many schedules to retrieve! Try again!');
    });

    request.addEventListener('loadend', () => {
      displayAllSchedules('The request is now complete.');
    });
  
    request.send();
  }

  function addStaff() {
    let data = new FormData(addStaffForm);
    let formDataJson = JSON.stringify(formDataToObj(data));

    let request = new XMLHttpRequest();
    request.open('POST', addStaffForm.action);
    request.setRequestHeader('Content-Type', 'application/json');

    request.addEventListener('load', () => {
      if (request.status === 201) {
        let idResponse = JSON.parse(request.response);
        alert(`Successfully created staff with id: ${idResponse.id}`);
        addStaffForm.reset();
      } else if (request.status === 400) {
        alert(request.responseText);
      }
    });

    request.send(formDataJson);
  }

  function formDataToObj(formData) {
    let obj = {};

    for (let entry of formData.entries()) {
      if (entry[0] === 'booking_sequence') {
        obj[entry[0]] = Number(entry[1]);
      } else {
        obj[entry[0]] = entry[1];
      }
    }

    return obj;
  }

  function createAddScheduleTemplate() {
    let scheduleTemplate = document.querySelector('#schedule-1');
    let addSchedulesArea = document.querySelector('#add-schedules');
    nextScheduleNum = String(addSchedulesArea.children.length + 1);

    let newSchedule = scheduleTemplate.cloneNode(true);
    newSchedule.setAttribute('id', `schedule-${nextScheduleNum}`);

    let legend = newSchedule.querySelector('legend');
    legend.textContent = `Schedule ${nextScheduleNum}`;

    let staffNameInputs = newSchedule.querySelector('.staff-name');
    let staffNameLabel = staffNameInputs.children[0];
    let staffNameInput = staffNameInputs.children[1];
    staffNameLabel.setAttribute('for', `staff-name-${nextScheduleNum}`);
    staffNameInput.setAttribute('name', `staff-name-${nextScheduleNum}`);
    populateStaffSelector(staffNameInput);

    let dateInputs = newSchedule.querySelector('.date');
    let dateLabel = dateInputs.children[0];
    let dateInput = dateInputs.children[1];
    dateLabel.setAttribute('for', `date-${nextScheduleNum}`);
    dateInput.setAttribute('name', `date-${nextScheduleNum}`);
    dateInput.value = '';

    let timeInputs = newSchedule.querySelector('.time');
    let timeLabel = timeInputs.children[0];
    let timeInput = timeInputs.children[1];
    timeLabel.setAttribute('for', `time-${nextScheduleNum}`);
    timeInput.setAttribute('name', `time-${nextScheduleNum}`);
    timeInput.value = '';

    addSchedulesArea.appendChild(newSchedule);
  }

  function populateStaffSelector(staffSelectorElement) {
    let allStaff;
    let request = new XMLHttpRequest();
    request.open('GET', 'http://localhost:3000/api/staff_members');
    request.responseType = 'json';

    request.addEventListener('load', () => {
      allStaff = request.response;
      allStaff.forEach(({id, name}) => {
        let option = document.createElement('option');
        option.setAttribute('value', id);
        option.textContent = name;
        staffSelectorElement.appendChild(option);
      });
    });

    request.send();
  }

  function multipleFormInputsToJson(data) {
    let json = [];
    let all_data = {};

    for (let [key, value] of data) {
      all_data[key] = value;
    }

    for (let i = 0; i < nextScheduleNum; i += 1) {
      let schedule = {};

      schedule.staff_id = Number(all_data[`staff-name-${i + 1}`]);
      schedule.date = all_data[`date-${i + 1}`];
      schedule.time = all_data[`time-${i + 1}`];

      json.push(schedule);
    }

    return { schedules: json };
  }

  function submitNewSchedule() {
    let request = new XMLHttpRequest();
    let data = new FormData(addScheduleForm);
    let json = JSON.stringify(multipleFormInputsToJson(data));

    request.open('POST', addScheduleForm.action);
    request.setRequestHeader('Content-Type', 'application/json');

    request.addEventListener('load', () => {
      if (request.status === 201) {
        alert(request.responseText);
        addScheduleForm.reset();
      } else {
        alert(request.responseText);
      }
    });

    request.send(json);
  }

  function retrieveAllPossibleSchedules() {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      request.open('GET', 'http://localhost:3000/api/schedules');
      request.timeout = 5000;
      request.responseType = 'json';

      request.addEventListener('load', event => {
        resolve(request.response);
      });
  
      request.addEventListener('timeout', () => {
        request.abort();
        reject('There are too many schedules to retrieve. Try again!');
      });

      request.send();
    });
  }

  function populateAvailableSchedules() {
    retrieveAllPossibleSchedules().then(allSchedules => {
      return allSchedules.filter(({student_email}) => {
        return student_email === null;
      });
    })
    .then(availableSchedules => {
      return retrieveAllStaff(availableSchedules);
    })
    .then(resolvedVal => {
      mapStaffNameToSchedule(...resolvedVal);
    })
    .catch(error => alert(error));
  }

  function mapStaffNameToSchedule(allStaff, availableSchedules) {
    availableSchedules.forEach(({id, staff_id, date, time}) => {
      let staffName = allStaff.filter(({id}) => id === staff_id)[0]['name'];
      let scheduleInfo = `${staffName} | ${date} | ${time}`;
      let option = document.createElement('option');
      option.setAttribute('value', id);
      option.textContent = scheduleInfo;
      availableScheduleSelector.appendChild(option);
    });
  }

  function retrieveAllStaff(availableSchedules) {
    return new Promise((resolve) => {
      let request = new XMLHttpRequest();
      request.open('GET', 'http://localhost:3000/api/staff_members');
      request.responseType = 'json';
    
      request.addEventListener('load', () => {
        resolve([request.response, availableSchedules]);
      });

      request.send();
    });


  }

  function bookSchedule() {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      let data = new FormData(bookScheduleForm);
      let json = JSON.stringify(formDataToObj(data));

      request.open('POST', bookScheduleForm.action);
      request.setRequestHeader('Content-Type', 'application/json');

      request.addEventListener('load', () => {
        if (request.status === 204) {
          alert('Booked');
          bookScheduleForm.reset();
        } else if (request.status === 404) {
          let responseText = request.responseText;
          if (responseText.includes('booking_sequence')) {
            alert(responseText);
            reject(responseText.match(/[0-9]+/g)[0]);
          } else {
            alert(responseText);
          }
        }
      });

      request.send(json);
    });
  }

  function loadNewStudentForm() {
    let newStudentArea = document.querySelector('#new-student-area');
    let header = document.createElement('h2');
    header.textContent = 'Please provide new student details';
    newStudentArea.appendChild(header);

    let form = document.createElement('form');
    form.setAttribute('id', 'add-student-form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', '/api/students');
    newStudentArea.appendChild(form);

    let emailDiv = document.createElement('div');
    let emailLabel = document.createElement('label');
    emailLabel.setAttribute('for', 'email');
    emailLabel.textContent = 'Email: ';
    let emailInput = document.createElement('input');
    emailInput.setAttribute('type', 'text');
    emailInput.setAttribute('name', 'email');
    emailDiv.appendChild(emailLabel);
    emailDiv.appendChild(emailInput);
    form.appendChild(emailDiv);

    let nameDiv = document.createElement('div');
    let nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'name');
    nameLabel.textContent = 'Name: ';
    let nameInput = document.createElement('input');
    nameInput.setAttribute('type', 'text');
    nameInput.setAttribute('name', 'name');
    nameDiv.appendChild(nameLabel);
    nameDiv.appendChild(nameInput);
    form.appendChild(nameDiv);

    let bookingSequenceDiv = document.createElement('div');
    let bookingSequenceLabel = document.createElement('label');
    bookingSequenceLabel.setAttribute('for', 'booking_sequence');
    bookingSequenceLabel.textContent = 'Booking Sequence: ';
    let bookingSequenceInput = document.createElement('input');
    bookingSequenceInput.setAttribute('type', 'text');
    bookingSequenceInput.setAttribute('name', 'booking_sequence');
    bookingSequenceDiv.appendChild(bookingSequenceLabel);
    bookingSequenceDiv.appendChild(bookingSequenceInput);
    form.appendChild(bookingSequenceDiv);

    let submitButton = document.createElement('button');
    submitButton.setAttribute('type', 'submit');
    submitButton.textContent = 'Submit';
    form.appendChild(submitButton);

    bookScheduleArea.appendChild(newStudentArea);
    addStudentForm = form;
  }

  function submitStudent() {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      let data = new FormData(addStudentForm);
      let json = JSON.stringify(formDataToObj(data));
      console.log(json);

      request.open('POST', addStudentForm.action);
      request.setRequestHeader('Content-Type', 'application/json');

      request.addEventListener('load', () => {
        if (request.status === 201) {
          alert(request.responseText);
          bookSchedule();
        } else if (request.status === 403 || request.status === 400) {
          alert(request.responseText);
        }
      });

      request.send(json);
    });
  }

  function displayAllBookings() {
    retrieveBookingDates().then(bookingDates => {
      bookingDates.forEach(date => {
        let li = document.createElement('li');
        li.textContent = date;
        li.style.cursor = 'pointer';
        li.classList.add('booking-date');
        bookingDatesList.appendChild(li);
      });
    });
  }

  function retrieveBookingDates() {
    return new Promise((resolve) => {
      let request = new XMLHttpRequest();
      request.open('GET', 'http://localhost:3000/api/bookings');
      request.responseType = 'json';

      request.addEventListener('load', () => {
        resolve(request.response);
      });

      request.send();
    });
  }

  function retrieveDateInfo(date) {
    return new Promise((resolve) => {
      let request = new XMLHttpRequest();
      request.open('GET', `http://localhost:3000/api/bookings/${date}`);
      request.responseType = 'json';

      request.addEventListener('load', () => {
        resolve(request.response);
      });

      request.send();
    });
  }

  function displayBookingInfo(event) {
    let target = event.target;
    let date = target.textContent;
    let detailedUL = document.createElement('ul');
    target.appendChild(detailedUL);

    retrieveDateInfo(date).then(dateInfo => {
      dateInfo.forEach(([staffName, studentEmail, time]) => {
        let info = `${staffName} | ${studentEmail} | ${time}`;
        let li = document.createElement('li');
        li.textContent = info;
        detailedUL.appendChild(li);
      });
    });
  }

  function populateAllBookings() {
    let cancelBookingSelector = document.querySelector('#cancel-booking-dropdown');

    let allSchedules = new XMLHttpRequest();
    allSchedules.open('GET', 'http://localhost:3000/api/schedules');
    allSchedules.responseType = 'json';

    allSchedules.addEventListener('load', () => {
      let allSchedulesArr = allSchedules.response;
      let allBookingDates = new XMLHttpRequest();
      allBookingDates.open('GET', 'http://localhost:3000/api/bookings');
      allBookingDates.responseType = 'json';

      allBookingDates.addEventListener('load', () => {
        let allBookingsArr = allBookingDates.response;
        allBookingsArr.forEach(date => {
          let bookingInfo = new XMLHttpRequest();
          bookingInfo.open('GET', `http://localhost:3000/api/bookings/${date}`);
          bookingInfo.responseType = 'json';

          bookingInfo.addEventListener('load', () => {
            let [staffName, studentEmail, time] = bookingInfo.response[0];

            let scheduleID = allSchedulesArr.filter(schedule => {
              return schedule.date === date && schedule.time === time && schedule.student_email === studentEmail;
            })[0]['id'];

            let option = document.createElement('option');
            option.setAttribute('value', scheduleID);
            option.textContent = `${date} | ${staffName} | ${studentEmail} | ${time}`;
            cancelBookingSelector.appendChild(option);
          });

          bookingInfo.send();
        });
      });

      allBookingDates.send();
    });

    allSchedules.send();
  }

  function populateAllSchedulesToDelete() {
    retrieveAllPossibleSchedules().then(allSchedules => {
      return retrieveAllStaff(allSchedules);
    })
    .then(resolvedVal => {
      mapStaffNameToScheduleForDeletion(...resolvedVal);
    })
    .catch(error => alert(error));
  }

  function mapStaffNameToScheduleForDeletion(allStaff, allSchedules) {
    let scheduleDeletionSelector = document.querySelector('#delete-schedule-dropdown');
    allSchedules.forEach(({id, staff_id, date, time}) => {
      let staffName = allStaff.filter(({id}) => id === staff_id)[0]['name'];
      let scheduleInfo = `${staffName} | ${date} | ${time}`;
      let option = document.createElement('option');
      option.setAttribute('value', id);
      option.textContent = scheduleInfo;
      scheduleDeletionSelector.appendChild(option);
    });
  }

  function completeScheduleDeletion() {
    let data = new FormData(deleteScheduleForm);
    let dataObj = formDataToObj(data);
    let scheduleId = dataObj['schedule_id'];
    cancelSchedule(scheduleId);
  }

  function completeBookingCancellation() {
    let data = new FormData(cancelBookingForm);
    let dataObj = formDataToObj(data);
    let bookingId = dataObj['booking_id'];
    cancelBooking(bookingId);
  }

  function cancelSchedule(scheduleId) {
    let request = new XMLHttpRequest();
    request.open('DELETE', `http://localhost:3000/api/schedules/${String(scheduleId)}`);

    request.addEventListener('load', () => {
      if (request.status === 204) {
        alert('Schedule deleted');
      } else if (request.status === 403 || request.status === 404) {
        alert(request.responseText);
      }
    });

    request.send();
  }

  function cancelBooking(bookingId) {
    let request = new XMLHttpRequest();
    request.open('PUT', `http://localhost:3000/api/bookings/${String(bookingId)}`);

    request.addEventListener('load', () => {
      if (request.status === 204) {
        alert('Booking cancelled');
      } else if (request.status === 404) {
        alert(request.responseText);
      }
    });

    request.send();
  }
});
