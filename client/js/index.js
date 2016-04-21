/* ofline object */

//
//
//  объект офлайн который создаёт очередь изменений на локальной машине
//  и интервал который проверяет доступен ли сервер
//  если сервер доступен, то интервал начинает чистить очередь
//  если очереди не осталось интервал уничтожается
//
//

var ofline = {
  objsup: [],
  objsad: [],
  run: function(){
    if(!ofline.inter){
      inter = setInterval( function(){
        if(ofline.objsad.length){
          var data = ofline.objsad[0];
          addStudent(data).then(function(){
            console.log(data);
            ofline.objsad.shift();
          }).catch(function(e){
            console.log('fail offline');
          });
        }else if(ofline.objsup.length){
          var data = ofline.objsup[0];
          updateStudent(data).then(function(){
            console.log(data);
            ofline.objsup.shift();
          }).catch(function(e){
            console.log('fail offline');
          });
        }else{
          clearInterval(ofline.inter);
          ofline.inter = 0;
        }
      },5000);
    }
  },
  inter: 0,
  getStudents: []
}

/* Application */
function getFormData(form) {
    return [].reduce.call(
        form.querySelectorAll('input, textarea'),
        (result, formElement) => {
            result[formElement.name] = formElement.value;
            return result;
        }, {}
    );
}

function updateStudentsList(studentsData) {
    ofline.getStudents = studentsData;
    const studentsHTML = studentsData.map(renderStudent).join('');

    [].forEach.call(
        document.querySelectorAll('.students__list'),
        (container) => {
            container.innerHTML = studentsHTML;
        }
    );
}

function delegate(containers, selector, event, handler) {
    [].forEach.call(containers, (container) => {
        container.addEventListener(event, function (e) {
            if (e.target.matches(selector)) {
                handler.apply(e.target, arguments);
            }
        });
    });
}

function onStudentAddClick(e) {
    e.preventDefault();

    this.setAttribute('disabled', 'disabled');

    getStudentData(this.closest('form'))
        .then(addStudent)
        .then(() => {
            [].forEach.call(
                this.closest('form').querySelectorAll('input, textarea'),
                (x) => x.value = ''
            );
        })
        .then(getStudents)
        .then(updateStudentsList)
        .catch((e) => {
            if (!(e instanceof ValidationError)) {
                console.error(e);
                ///alert('Что-то пошло не так!');
                var parseData = getFormData(this.closest('form'));
                parseData.picSrc = parseData.picture; // на всякий случай...
                parseData.id = 'n'+(new Date()).getTime();
                ofline.objsad.push(parseData);
                var result = ofline.getStudents.concat(ofline.objsad?ofline.objsad:[]);
                updateStudentsList(result);
                [].forEach.call(
                    this.closest('form').querySelectorAll('input, textarea'),
                    (x) => x.value = ''
                );
            }
        })
        .then(() => {
            this.removeAttribute('disabled');
        });
}

function onStudentUpdateClick(e) {
    const studentContainer = this.closest('.student');
    const studentData = studentContainer.dataset.student;
    console.log('updating ', studentData);
    studentContainer.innerHTML = renderStudentForm(JSON.parse(studentData));
}

function onStudentSaveClick(e) {
    e.preventDefault();

    const studentContainer = this.closest('.student');
    const studentData = getFormData(this.closest('form'));

    this.setAttribute('disabled', 'disabled');

    getStudentData(this.closest('form'))
        .then(updateStudent)
        .then((student) => {
            var newStudentsContainer = document.createElement('div');
            newStudentsContainer.innerHTML = renderStudent(student);
            var newStudentContainer = newStudentsContainer.removeChild(newStudentsContainer.querySelector('.student'));
            var studentsContainer = studentContainer.parentElement;

            studentsContainer.insertBefore(newStudentContainer, studentContainer);
            studentsContainer.removeChild(studentContainer);
        })
        .catch((e) => {
            if (!(e instanceof ValidationError)) {
                console.error(e);
                //alert('Что-то пошло не так! 1');  ///// сначала поймали ошибку в режиме офлайн
                var newStudentsContainer = document.createElement('div'); /// дальше копипастим код, как если б всё норм
                /// тут не всё ровно происходит заменяем некоторые имена в json
                var parseForm = studentData;
                parseForm.picSrc = studentData.picture;
                //delete studentData.picture; /// хотя ладно пускай висит, лишним не будет
                newStudentsContainer.innerHTML = renderStudent(parseForm);
                var newStudentContainer = newStudentsContainer.querySelector('.student')?
                newStudentsContainer.removeChild(newStudentsContainer.querySelector('.student')):
                newStudentsContainer; /// не люблю такие конструкции с кучей вызовов, я б проверял.... Как тут
                //// а то бессмысленный креш, если какое-либо иное поведение или для полной предсказуемости использовать is.js
                if(parseForm.id.indexOf('n')===-1){
                  ofline.objsup.push(parseForm);
                }else{ //// вообще не туда свернул.... Надо было расставлять аттрибуты у .student а потом оттуда забирать конкретное изменение
                  for(var n in ofline.objsad){
                    if (ofline.objsad[n].id.indexOf('n')!==-1){
                      parseForm.id = 'n'+(new Date()).getTime();
                      ofline.objsad[n] = parseForm;
                    }
                  }
                }
                console.log(ofline.objsup);
                ofline.run();
                var studentsContainer = studentContainer.parentElement;
                studentsContainer.insertBefore(newStudentContainer, studentContainer);
                studentsContainer.removeChild(studentContainer);
            }
        })
        .then(() => {
            this.removeAttribute('disabled');
        });
}

function renderStudent(student) {
    return `
        <div class="student" data-student='${JSON.stringify(student)}'>
            <div class="student__picture">
                <img src="${student.picSrc}">
            </div>
            <div class="student__info">
                <h2 class="student__name">${student.name}</h2>
                <p class="student__bio">${student.bio}</p>
                <button class="student__update-btn">Изменить</button>
            </div>
        </div>
    `;
}

function renderStudentForm(student) {
    return `
        <form class="student__update-form student-form">
            <input type="hidden" name="id" value="${student.id}">
            <label class="student-form__field student-form__field-name">
                <span class="student-form__field-label">Имя</span><input type="text" name="name" value="${student.name}">
            </label>
            <label class="student-form__field student-form__field-picture">
                <span class="student-form__field-label">URL фотографии</span><input type="text" name="picture" value="${student.picSrc}">
            </label>
            <label class="student-form__field student-form__field-bio">
                <span class="student-form__field-label">Кратко о себе</span><textarea name="bio" rows="5" cols="40">${student.bio}</textarea>
            </label>
            <button class="student__save-btn">Сохранить</button>
        </form>
    `;
}

function getStudentData(form) {
    return new Promise((resolve, reject) => {
        [].forEach.call(form.querySelectorAll('.student-form__field'), (field) => {
            field.classList.remove('student-form__field_error');
        });

        const student = getFormData(form);
        const validationResult = validateStudent(student);

        if (validationResult === true) {
            resolve(student);
        } else {
            form.querySelector('.student-form__field-' + validationResult.prop)
                .classList.add('student-form__field_error');

            reject(validationResult);
        }
    });
}

function validateStudent(student) {
    try {
        validate(student, 'name', 'Не заполнено имя студента');
        validate(student, 'picture', 'Неправильный адрес фотографии студента');
        validate(student, 'bio', 'Не заполнена биография');
    } catch (e) {
        if (e instanceof ValidationError) {
            return e;
        }

        throw e;
    }

    return true;
}

function validate(obj, prop, msg) {
    if (obj.hasOwnProperty(prop) && validators[prop] && !validators[prop](obj[prop], obj)) {
        throw new ValidationError(prop, msg);
    }
}

const validators = {
    name: (value, obj) => {
        return Boolean(value);
    },
    picture: (value, obj) => {
        if (!value) return false;
        if (!/^https?:\/\//.test(value)) return false;
        return true;
    },
    bio: (value, obj) => {
        return Boolean(value);
    }
};

function ValidationError(prop, message) {
  this.name = 'ValidationError';
  this.prop = prop;
  this.message = message || 'Произошла ошибка валидации';
  this.stack = (new Error()).stack;
}
ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;

/* API accessors */

function json(response) { return response.json(); }

function getStudents() {
    return fetch('/api/v1/students').then(json);
}

function addStudent(student) {
    return fetch('/api/v1/students', {
        method: 'post',
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(student)
    }).then(json);
}

function updateStudent(student) {
    return fetch(`/api/v1/students/${student.id}`, {
        method: 'put',
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(student)
    }).then(json);
}

/* Init */

document.addEventListener('DOMContentLoaded', (event) => {
    delegate(
        document.querySelectorAll('.students'),
        '.students__add-btn',
        'click',
        onStudentAddClick
    );

    delegate(
        document.querySelectorAll('.students'),
        '.student__update-btn',
        'click',
        onStudentUpdateClick
    );

    delegate(
        document.querySelectorAll('.students'),
        '.student__save-btn',
        'click',
        onStudentSaveClick
    );

    getStudents().then(updateStudentsList);
});
