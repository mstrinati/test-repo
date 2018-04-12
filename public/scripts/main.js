// Execute when the DOM is ready
$(function(){

  // CONSTANTS
  var HOSTNAME = '//localhost:3333';

  // Application flags & values (Flags are set at the top of the scope chain to 'set' the application into a state; executed functions then check on the relevant flags when deciding how/when to perform their actions. 'Loading' is a common flag, which is set to true, then when you've loaded your data you can set it to false)
  var updating = false;
  var carToBeUpdated = null;

  // DOM nodes used to manipulate the UI
  var $carsList = $('#cars-list');
  var $carCountIndicator = $('#car-count');
  var $formTitle = $('.form-title');
  var $submitButton = $('.submit-btn');
  var $form = $('#car-form');
  var $makeInput = $form.find('#make');
  var $bhpInput = $form.find('#bhp');

  // Important UI text values
  var $submitButtonText = $submitButton.text();
  var $originalFormTitle = $formTitle.text();
  var activeButtonClass = 'active';

  // Templating
  var source   = $("#car-template").html();
  var templateFn = Handlebars.compile(source);

  // Hold state internally. This is the 'state' of our app - it is an array of cars
  var _cars = [];

  // utitlity functions
  // reset form after submission
  function resetForm() {
    $form.find('input[type="text"], input[type="number"]').val('');
  }

  // remove car from state array
  function removeCar(id) {
    // Find index
    var i = _cars.findIndex(function(car){
      return id === car._id;
    });
    // delete (remember splice is a mutator)
    _cars.splice(i, 1);
  }

  // update car in state array
  function updateCar(car, data) {
    // find where it is in the array
    var i = _cars.findIndex(function(car){
      return car._id === carToBeUpdated._id;
    });
    // fill that slot with new object created by merging an empty object with the old details and the new data
    _cars[i] = Object.assign({}, _cars[i], data);
  }

  // Show the state in the UI
  function writeCarsToPage() {
    $carsList.html('');
    $carCountIndicator.text(_cars.length);
    _cars.forEach(function(car){
      $carsList.append(templateFn(car));
    });
  }

  // Simple error handler for ajax
  function handleAjaxFail (err) {
    console.log(err.message);
    alert('Ajax Failed');
  }


  // Initial GET cars
  $.ajax({
    url: HOSTNAME + '/cars'
  })
  .done(function(cars){
    // update state
    _cars = cars;

    // write it out to the page
    writeCarsToPage();
  })
  .fail(handleAjaxFail);

  // Handle add or update via the form
  $form.on('submit.addOrUpdate', function(){
    // Scrape data from inputs
    var bhpNumber = parseInt($bhpInput.val(), 10);

    // Handle bad data
    if(isNaN(bhpNumber)) {
      $bhpInput.val('');
      alert('BHP must be an integer');
      return;
    }

    var data = {
      make: $makeInput.val(),
      bhp: bhpNumber
    };

    console.log('data', data);

    // Setup default options to perform a POST request
    var callOptions = {
      url: HOSTNAME + '/cars',
      method: 'POST',
      data: data
    };

    // If the app is in an updating state then modify that to be a PUT request
    if (updating) {
      callOptions.method = 'PUT';
      callOptions.url = HOSTNAME + '/cars/' + carToBeUpdated._id;
    }

    // Make the call. Then, when done, ...
    $.ajax(callOptions)
      .done(function(car) {
        console.log(car);
        if (updating) {
          // update state
          updateCar(car, data);
          // reset app state to default
          exitUpdating();
        } else {
          // update state
          _cars.push(car);
        }
        // Update UI to match state
        writeCarsToPage();
      })
      .fail(handleAjaxFail);
    return false;
  });

  // delete
  $carsList.on('click.delete', '.delete', function() {
    // Find the ID
    var carID = $(this).data('id');

    // Make the call
    $.ajax({
      url: HOSTNAME + '/cars/' + carID,
      method: 'DELETE',
    })
    .done(function() {
      // Update State
      removeCar(carID);

      // Update UI to match state
      writeCarsToPage();
    })
    .fail(handleAjaxFail);
    return false; // Stop the form submitting
  });

  // Put app into 'updating' state
  function setUpForUpdate(id) {
    // Set the flag
    updating = true;
    // Set the car we're currently updating
    carToBeUpdated = _cars.find(function(car){
      return car._id === id;
    });
    console.log('setting ' + carToBeUpdated.make + ' to be updated');
    // Put current values into the form inputs
    $makeInput.val(carToBeUpdated.make);
    $bhpInput.val(carToBeUpdated.bhp);

    // Change form title and submit button text to match
    $formTitle.text('Update ' + carToBeUpdated.make);
    $submitButton.text('Update');
  }

  // Reset app to default state
  function exitUpdating() {
    console.log('exiting update');
    // Reset Flags & values
    updating = false;
    carToBeUpdated = null;

    // Reset DOM
    // DOM node text
    $formTitle.text($originalFormTitle);
    $submitButton.text($submitButtonText);

    // Empty the form
    resetForm();
  }

  // updating
  $carsList.on('click.update', '.update', function() {
    // Find the button
    var $btn = $(this);
    // Allow for toggling
    if($btn.hasClass(activeButtonClass)){
      // Here the button is already clicked and the app is in 'updating' mode. When the user clicks it again, we...
      // Reset the button to normal
      $btn.removeClass(activeButtonClass);
      // Reset the app state from updating mode
      exitUpdating();
    } else {
      // Make all other buttons non-active
      $('.update').removeClass(activeButtonClass);
      // Make this one active
      $btn.addClass(activeButtonClass);

      // Set the app state to be updating
      setUpForUpdate($btn.data('id'));
    }
    return false; // stop the default action and prevent event bubbling
  });
});
