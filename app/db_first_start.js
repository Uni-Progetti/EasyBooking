var db_update = require('./db_update.js');

async function init() {
    var db_seed = require('./seed.js')
    console.log("Seeding DB");
    await sleep(8000);
    console.log("Syncronizing time for reservation");
    db_update.seats_and_reservations_get_seed();
}
  
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

init();