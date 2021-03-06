let sortingMines = [];
let needsList = [];
let itemArray = [];
let recursionCount = 0;
const noTime = ["mining", "shop", "waterCollection"];

//set up select options
const select = document.getElementsByClassName("what");
for (let i = 0; i < select.length; i++){
	materials.sort(function(a, b){
		if (a.name > b.name){
			return 1;
		}
		if (a.name < b.name){
			return -1;
		}
		return 0;
	});

	materials.forEach(function(e){
		const name = e.name;
		const el = document.createElement("option");
		el.textContent = name;
		el.value = name;
		select[i].appendChild(el);
	});
}

function makeInputNeeds(itemArray, availableMines, maxArea){
	itemArray.forEach(function(e){
		makeThese(e.name, e.quantity);
	});

	findMines(maxArea, availableMines);
}

function makeThese(stuff, quant){
	if (stuff === "coal" && document.getElementById("use-charcoal").checked){
		stuff = "charcoal";
	}

	const material = materials.filter(function(e){
		return e.name === stuff;
	})[0];

	//build array of all needs
	material.quantity = quant;
	if (needsList.length === 0){
		needsList.push(Object.assign({}, material));
	} else {
		let matchCounter = 0;
		for (let i = needsList.length - 1; i >= 0; i--){
			if (needsList[i].name === material.name){
				needsList[i].quantity = needsList[i].quantity + quant;
				break;
			} else {
				matchCounter++;
				if (matchCounter === needsList.length){
					needsList.push(Object.assign({}, material));
				}
			}
		}
	}
	//recurse if necessary
	let q;
	if (material.hasOwnProperty("toMake")){
		//make sure we're working with whole batches
		if (material.hasOwnProperty("batch")){
			material.toMake.forEach(function(e){
				if (quant % material.batch === 0){
					q = quant * e.quantity / material.batch;
				} else {
					const wholeBatches = Math.floor(quant / material.batch);
					q = ((wholeBatches + 1) * e.quantity);
				}

				makeThese(e.thing, q);

			});
		} else {
			material.toMake.forEach(function(e){
				q = e.quantity * quant;
				makeThese(e.thing, q);
			});
		}
	}
}

function findMines (maxArea, availableMines) {
	let minableSum = 0;
	let needSum = 0;
	let minableNeeds = 0;

	needsList.forEach(function(miningNeed){
		miningNeed.totalMinable = 0;
		if (miningNeed.source === "mining"){
			minableNeeds++;
			needSum += parseFloat(miningNeed.quantity);
	
			const toMine = miningNeed.name;
			mines.forEach(function(mine){
				if (maxArea - mine.area >= 0 && mine.hasOwnProperty(toMine)){
					if (sortingMines.length === 0){
						sortingMines.push(Object.assign({}, mine));
						sortingMines[sortingMines.length-1].howMuch = mine[toMine];

						miningNeed.totalMinable = parseFloat(miningNeed.totalMinable) + parseFloat(mine[toMine]);
						minableSum += parseFloat(mine[toMine]);

					} else {
						let found;
						let i;
						searchingMinesLoop:
						for (i = 0; i < sortingMines.length; i++){
							if (sortingMines[i].area === mine.area){
								found = true;
								break searchingMinesLoop;
							}
						}

						if (found){
							sortingMines[i].howMuch = parseFloat(sortingMines[i].howMuch) + parseFloat(mine[toMine]);
							miningNeed.totalMinable = parseFloat(miningNeed.totalMinable) + parseFloat(mine[toMine]);
							minableSum += parseFloat(mine[toMine]);

						} else {
							sortingMines.push(Object.assign({}, mine));
							sortingMines[sortingMines.length-1].howMuch = mine[toMine];
							miningNeed.totalMinable = parseFloat(miningNeed.totalMinable) + parseFloat(mine[toMine]);
							minableSum += parseFloat(mine[toMine]);
						}
					}
				}
			});
		}
	});
	miningAlgorithm(availableMines, minableSum, needSum, minableNeeds);
}

function miningAlgorithm(availableMines, minableSum, needSum, minableNeeds){
	calculateLoop:
	for (let i = 0; i < availableMines; i++){
		let weightedNeedSum = 0;
		needsList.forEach(function(miningNeed){
			if (miningNeed.source === "mining"){
				miningNeed.percentOfTotalMinable = miningNeed.totalMinable / minableSum;

				if (miningNeed.hasOwnProperty("runningSum")){
					miningNeed.weightedNeed = (parseFloat(miningNeed.quantity) / needSum * availableMines * 100) - parseFloat(miningNeed.runningSum);
				} else {
					miningNeed.weightedNeed = (parseFloat(miningNeed.quantity) / needSum * availableMines * 100);
				}

				if (miningNeed.weightedNeed < 0){
					miningNeed.weightedNeed = 0;
				}

				weightedNeedSum += parseFloat(miningNeed.weightedNeed);

			}
		});

		needsList.forEach(function(miningNeed){
			if (miningNeed.source === "mining"){
				miningNeed.percentofWeightedNeed = parseFloat(miningNeed.weightedNeed) / weightedNeedSum;
				miningNeed.priority = parseFloat(miningNeed.percentofWeightedNeed) / parseFloat(miningNeed.percentOfTotalMinable);
			} else {
				miningNeed.priority = 0;	
			}
		});

		needsList.sort(function(a, b){
			return b.priority - a.priority;
		});

		sortingMines.sort(function(a, b){
			return b.howMuch - a.howMuch;
		});

		//check to see that each mined material has at least one mine

		// check each minable need against sortingMines

		//if sortingMines doesn't have a mine to produce the need, make that the top priority
		if (i >= availableMines - minableNeeds){
			checkForOrphanNeeds:
			for (let j = 0; j < needsList.length; j++){
				if (needsList[j].source === "mining" && !needsList[j].hasOwnProperty("checked")){
					needsList[j].checked = true;
					let matchCounter = 0;
					checkAgainstMines:
					for (let k = 0; k < sortingMines.length; k++){
						if (sortingMines[k].hasOwnProperty(needsList[j].name) && sortingMines[k].hasOwnProperty("order")){
							break checkForOrphanNeeds;
						} else {
							matchCounter++;
							if (matchCounter === sortingMines.length){
								needsList.unshift(needsList[j]);
								needsList.splice([j+1], 1);
							}
						}
					}
				}
			}	
		}
		chooseMine(i);
	}
	const sortedMines = [];
	sortingMines.forEach(function(e){
		if(e.hasOwnProperty("order")){
			sortedMines.push(e);
		}
	});

	displayResults(sortedMines);
}

function chooseMine(orderIndex){
	getHighestPriority:
	for (let l = 0; l < needsList.length; l++){
		getMatchingMine:
		for (let m = 0; m < sortingMines.length; m++){
			if (sortingMines[m].hasOwnProperty(needsList[l].name) && sortingMines[m].howMuch > 0){
				sortingMines[m].order = orderIndex;
				sortingMines[m].howMuch = 0;
				needsList.forEach(function(miningNeed){
					if (miningNeed.source === "mining"){
						if (sortingMines[m].hasOwnProperty(miningNeed.name)){
							if (miningNeed.hasOwnProperty("runningSum")){
								miningNeed.runningSum += parseFloat(sortingMines[m][miningNeed.name]);
							} else {
								miningNeed.runningSum = parseFloat(sortingMines[m][miningNeed.name]);
							}
						}
					}
				});
				break getHighestPriority;
			}
		}
	}
}

const resultDiv = document.getElementById("result");
const sortedDiv = document.getElementById("sorted-by-area");
let content;

function displayResults (sortedMines) {
	if (sortedMines.length === 0){
		document.getElementById("result").innerHTML = "<p>Mining isn't going to help you with this</p>";
		document.getElementById("sorted-by-area").innerHTML = "<p>Mining isn't going to help you with this</p>";
	} else {
		sortedMines.sort(function(a, b){
			return a.order - b.order;
		});

		//click list to display mines list sorted by priority
		document.getElementById("result").innerHTML = "<p>Click to sort mines by area</p>";
		sortedMines.forEach(function(e){
			content = "Mine at Area " + e.area;
			resultDiv.insertAdjacentHTML("beforeend", content + "<br>");
		});

		//click list to display mines list sorted by area
		document.getElementById("sorted-by-area").innerHTML = "<p>Click to sort mines by priority</p>";
		sortedMines.sort(function(a, b){
			return a.area - b.area;
		});
		sortedMines.forEach(function(e){
			content = "Mine at Area " + e.area;
			sortedDiv.insertAdjacentHTML("beforeend", content + "<br>");
		});
	}

	document.getElementById("needs").innerHTML = "<p>You will need:</p>";
	//sort needsList by source, then by quantity

	needsList.sort(function(a, b){
		if (a.source === b.source){
			return (a.quantity < b.quantity) ? 1 : (a.quantity > b.quantity) ? -1 : 0;
		} else {
			return (a.source > b.source) ? -1 : 1;
		}
	});

	for (let i = 0; i < needsList.length; i++){
		const qu = needsList[i].quantity.toLocaleString("en-us");
		const st = needsList[i].name;
		const so = needsList[i].source;
		let content = qu + " " + st + " via " + so;
		const time = [0,0,0,0];
		let ti;

		if (needsList[i].hasOwnProperty("batch")){
			ti = needsList[i].time * needsList[i].quantity / needsList[i].batch;
		} else {
			ti = needsList[i].time * needsList[i].quantity;
		}

		if (ti >= 86400){
			time[0] = Math.floor(ti/86400);
			ti -= time[0] * 86400;
		}
		if (ti >= 3600){
			time[1] = Math.floor(ti/3600);
			ti -= time[1] * 3600;
		}
		if (ti >= 60){
			time[2] = Math.floor(ti/60);
			ti -= time[2] * 60;
		}
		time[3] = ti;

		time.forEach(function(value, index, time){
			if (value === 0){
				time[index] = "00";
			}
		});

		let timeStr = "";
		if (time[0] > 0){
			timeStr = time[0] + ":" + time[1] + ":" + time[2] + ":" + time[3];
		} else  if (time[1] > 0){
			timeStr = time[1] + ":" + time[2] + ":" + time[3];
		} else {
			timeStr = time[2] + ":" + time[3];
		}

		if (needsList[i].time){
			content += ", which will take " + timeStr;
		}
		document.getElementById("needs").insertAdjacentHTML("beforeend", content + "<br>");
	}
}

document.getElementById("submit-button").addEventListener("click", function(e){
	sortingMines = [];
	needsList = [];
	itemArray = [];
	recursionCount = 0;

	document.getElementById("needs").innerHTML = "";

	const what = document.getElementsByClassName("what");
	const howMany = document.getElementsByClassName("how-many");

	for (let i = 0; i < what.length; i++){
		const item = {};
		item.name = what[i].value;
		item.quantity = howMany[i].value;

		if (itemArray.length === 0){
			itemArray.push(item);
		} else {
			let matchCounter = 0;
			for (let j = itemArray.length -1; j >=0; j--){
				if (itemArray[j].name === item.name){
					itemArray[j].quantity = parseFloat(itemArray[j].quantity) + parseFloat(item.quantity);
					break;
				} else {
					matchCounter++;
					if (matchCounter === itemArray.length){
						itemArray.push(item);
					}
				}
			}
		}
	}

	const availableMines = document.getElementById("mines").value;
	const maxArea = document.getElementById("area").value;
	makeInputNeeds(itemArray, availableMines, maxArea);
});

document.getElementById("more").addEventListener("click", addForm);

function addForm(){
	//clone the form
	const parentForm = document.getElementById("form");
	const item = document.querySelector(".item-needs");
	const itemClone = item.cloneNode(true);
	let last = document.querySelectorAll(".item-needs")[document.querySelectorAll(".item-needs").length-1];
	parentForm.insertBefore(itemClone, last.nextSibling);
	//add delete button to cloned form
	const deleteButton = document.createElement("button");
	deleteButton.classList.add("buttons");
	deleteButton.innerHTML = "Remove Item";
	deleteButton.type = "button";
	last = document.querySelectorAll(".item-needs")[document.querySelectorAll(".item-needs").length-1];
	last.appendChild(deleteButton);
	//tell delete button which div to delete
	deleteButton.addEventListener("click", function(e){
		last.parentNode.removeChild(last);
	});
}

document.querySelector(".mine-results").addEventListener("click", toggleMines);

function toggleMines(e){
	resultDiv.classList.toggle("hidden");
	sortedDiv.classList.toggle("hidden");
}
