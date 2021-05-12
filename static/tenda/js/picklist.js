import { createTable, rebuild_dbtable, getCurrentDateTime,fadeOut,lastSaturdayTS, lastSunTS } from "./helper.js"


const selectButton= document.querySelector(".picklist-select-btn");
const pickStatusOpt = document.querySelector("#pick_status");
const pickDate = document.querySelector("#pick_date");

if(!pickStatusOpt.value.includes("_at")) {
	pickDate.removeAttribute("min")
	pickDate.removeAttribute("step")
}

pickStatusOpt.addEventListener("change", function() {
	// weekly picked
	if(pickStatusOpt.value.includes("_at")) {
		console.log("option:", pickStatusOpt.value)
		let lastSun = lastSunTS();
		// pickDate.setAttribute("min", lastSun);
		pickDate.setAttribute("min", "2021-04-04");
		pickDate.setAttribute("step", "7");
	} else {
		pickDate.removeAttribute("min")
		pickDate.removeAttribute("step")
	}
});

selectButton.addEventListener("click", function() {
	let pickDate = document.querySelector("#pick_date").value
	let pickStatus = document.querySelector("#pick_status").value;
	let pickModel = document.querySelector("input[name=model]").value;

	console.log("pick date is:", pickDate)
	console.log("pick status is:", pickStatus)

	var fetch_url = `https://gzhang.dev/tenda/api/picklist?date=${pickDate}&status=${pickStatus}`
	if(pickModel) {
		fetch_url = `https://gzhang.dev/tenda/api/picklist?model=${pickModel}`
	}

	console.log("fetch_url:", fetch_url)
	let dbtable_container = document.querySelector("#dbtable_container");
	if (dbtable_container.innerHTML !== "") {
		dbtable_container.innerHTML = ""
	}
	if((!pickDate && pickStatus == "completed_at") || (!pickDate && pickStatus == "created_at")) {
		dbtable_container.innerHTML = `<div class="alert alert-danger">error: pick date is empty</div>`;
		let alertDanger = document.querySelector("#dbtable_container div.alert-danger")
		alertDanger.style.width  = "500px";
		fadeOut(alertDanger)
		return;
	}
	let cbtn = document.querySelector("#completeBtn")
	if(cbtn) {
		cbtn.remove();
	}
	if(pickStatus) {
		console.log("pick status is:", pickStatus)
		fetch(fetch_url)
		.then( resp => {
			return resp.json();
		})
		.then( data  => {
			if(!data[0]) {
				console.log("!data")
				const err = new Error("no rows return from database table: `picklist`")
				err.name = "Empty set"
				throw err;
			}
			if(data[0].PID) {
				let titles = ["PNO","customer", "model", "quantity", "status","location", "created_at", "Action"];
				let objNames =   ["PNO","customer", "model", "qty", "status","location", "created_at", "update"];
				let tbData = data;
				tbData.forEach( d => {
					d.update = `<a href="/tenda/update/picklist?PID=${d.PID}">update</a>`;
				})
				return {
					"titles": titles,
					"data": tbData,
					"names": objNames,
				}
			}
			if(data[0].LID) {
				let titles = ["LID","location", "model", "cartons", "boxes", "completed_at", "Action"];
				let objNames =   ["LID","location", "model", "cartons", "boxes", "completed_at", "update"];
				let tbData = data;
				tbData.forEach( d => {
					d.update = `<a href="/tenda/update/picklist?LID=${d.LID}">update</a>`;
				});
				return {
					"titles": titles,
					"data": tbData,
					"names": objNames,
				}
			}
			if(data[0].model) {
				let titles = ["item", "model", "total"];
				let tbData = data;
				let i = 0;
				tbData.forEach( d=> {
					d.item = i + 1;
					i++;
				})
				let objNames = ["item", "model", "total"];
				return {
					"titles":titles,
					"data": tbData,
					"names": objNames,
				}
			}
			
		})
		.then( tableObj => {
			let newtable = createTable(tableObj.titles, tableObj.data, tableObj.names)
			let dbtable_container = document.querySelector("#dbtable_container");
			if (dbtable_container.innerHTML !== "") {
				dbtable_container.innerHTML = ""
			}
			newtable.id = "dbtable"
			console.log("newtable:", newtable)
			dbtable_container.appendChild(newtable);
			$("#dbtable").DataTable({
				dom: 'Bfrtip',
				buttons: ['print'],
				// order: [5, "des"],
			});

			let table_width = rebuild_dbtable();
			return table_width;
		})
		.then((tw)=>{
			console.log("=> PENDING pickStatus:", pickStatus)
			let cbtn1 = document.querySelector("#completeBtn")
			if(!cbtn1 && pickStatus === "Pending") {
				let completeButton = document.createElement("button")
				completeButton.id = "completeBtn"
				completeButton.classList.add("btn", "btn-table")
				completeButton.textContent = "Complete"
				let dbtable_info = document.querySelector("#dbtable_info");
				let actionbtn_wrapper = document.createElement("div");
				actionbtn_wrapper.id="actionbtn_wrapper"
				actionbtn_wrapper.style.width=`${tw}px`
				actionbtn_wrapper.appendChild(completeButton)
				dbtable_info.insertAdjacentElement('afterend', actionbtn_wrapper)
			}
		})
		.then(()=>{
			// Add Event Listenser to appened `complete` Button
			const completePickBtn = document.querySelector('#completeBtn')
			if(!completePickBtn) {
				return
			}
			completePickBtn.addEventListener('click', function() {
				let formData = new FormData();
				let data = new URLSearchParams(formData);
				let pickStatus = document.querySelector('#pick_status').value
				let pickDate   = document.querySelector("#pick_date").value
				console.log("pick status to Complete:", pickStatus);
				console.log("pick date to complete", pickDate);
				console.log("lastSaturday", lastSaturdayTS());

				data.append("pickDate", pickDate)
				data.append("pickStatus", pickStatus)
				data.append("lastSaturday", lastSaturdayTS());

				let tableBody = document.querySelector('table tbody')
				let trows = tableBody.querySelectorAll('tr');
				// console.log("Complete Button Disabled");
				if (tableBody && trows.length) {
					fetch("https://gzhang.dev/tenda/api/complete/picklist", {
						method: "POST",
						body: data,
					})
					.then(resp => { 
						return resp.json();
					})
					.then(data => {
						console.log("data:",data);
						if(data) {
							const modal = document.querySelector(".modal");
							modal.classList.toggle("show-modal");
						}
						let model = document.querySelector(".model");
						let location = document.querySelector(".location");
						let sqlinfo = document.querySelector(".sqlinfo");
						let oldTotal = document.querySelector(".oldTotal");
						let pickQty = document.querySelector(".pickQty");
						let unit = document.querySelector(".unit");
						let newCartons = document.querySelector(".newCartons");
						let newBoxes = document.querySelector(".newBoxes");
						let newTotal = document.querySelector(".newTotal");

						// model.textContent = `Model: ${data[0].model}`
						// location.textContent = `Location: ${data[0].location}`
						// sqlinfo.textContent = `SQL: ${data[0].sqlinfo}`
						// oldTotal.textContent = `oldTotal: ${data[0].oldTotal}`
						// pickQty.textContent = `pickQty: ${data[0].pickQty}`
						// unit.textContent = `unit: ${data[0].unit}`
						// newCartons.textContent = `newCartons: ${data[0].newCartons}`
						// newBoxes.textContent = `newBoxes: ${data[0].newBoxes}`
						// newTotal.textContent = `newTotal: ${data[0].newTotal}`
						let newTotalTitle = ["oldTotal", "Pick Qty", "NEW Total", "CalcTotal"];
						let newCartonsTitle = ["NEW Total", "unit", "NEW Cartons", "CalcCartons"];
						let newBoxesTitle = ["NEW Total", "unit", "NEW Boxes", "CalcBoxes"];
						let newTotalData = []
						let newCartonsData = []
						let newBoxesData = []
						data.forEach( (d,i) => {
							// d.calcTotal = d.oldTotal - d.pickQty
							// console.log("d.calcTotal:", d.calcTotal);
							// let newTotalOrders = ['oldTotal', 'pickQty', 'newTotal', 'calcTotal']
							// let newTotalData = []
							// newTotalData.push(d)
							// let newTotalTble = createTable(newTotalTitle, newTotalData, newTotalOrders);

							// d.calcCartons = Math.trunc(d.calcTotal/d.unit)
							// let newCartonsOrders = ['newTotal', 'unit', 'newCartons', 'calcCartons']
							// let newCartonsData = []
							// newCartonsData.push(d)
							// let newCartonsTble = createTable(newCartonsTitle, newCartonsData, newCartonsOrders);

							// d.calcBoxes = ((d.calcTotal/d.unit) % 1).toFixed(2) * d.unit
							// d.calcBoxes = parseInt(d.calcBoxes)
							// let newBoxesOrders = ['newTotal', 'unit', 'newBoxes', 'calcBoxes']
							// let newBoxesData = []
							// newBoxesData.push(d)
							// let newBoxesTble = createTable(newBoxesTitle, newBoxesData, newBoxesOrders);

							// let cmpinfo = document.querySelector('.complete-info');
							// cmpinfo.appendChild(newTotalTble)
							// cmpinfo.appendChild(newCartonsTble)
							// cmpinfo.appendChild(newBoxesTble)
							let completeInfoTitle = ['Complete Model','SQL Info','NEW cartons', 'NEW boxes', 'NEW total'];
							let completeInfoOrders = ['model','sqlinfo','newCartons', 'newBoxes', 'newTotal']
							let completeData = []
							d.rowTitle = `${d.sqlinfo.split(' ')[0]} last_updated`
							completeData.push(d);

							let completeInfoTable = createTable(completeInfoTitle,completeData,completeInfoOrders)
							
							let calcTotal = d.oldTotal - d.pickQty
							let calcCartons = Math.trunc(calcTotal/d.unit)
							let calcBoxes = ((calcTotal/d.unit) % 1).toFixed(2) * d.unit
							calcBoxes = parseInt(calcBoxes)
							let ciTbody = completeInfoTable.tBodies[0]
							let ciRow = ciTbody.insertRow(1);

							let ciCell0 = ciRow.insertCell(0);
							ciCell0.textContent = d.location;

							let ciCell1 = ciRow.insertCell(1);
							ciCell1.textContent = 'UPDATE stock_updated';

							let ciCell2 = ciRow.insertCell(2);
							ciCell2.textContent = calcCartons;


							
							let ciCell3 = ciRow.insertCell(3);
							ciCell3.textContent = calcBoxes;
							let ciCell4 = ciRow.insertCell(4);
							ciCell4.textContent = calcTotal;
							let completefb = document.createElement("div");
							completefb.classList.add("complete-fd");
							completefb.appendChild(completeInfoTable)
							let cmpinfo = document.querySelector('#complete-info');
							cmpinfo.appendChild(completefb);

							// let calcTitle = ['CALC cartons', 'CALC boxes', 'CALC total'];
							// let calcOrders = ['calcCartons', 'calcBoxes', 'calcTotal']
							// let calcData = []
							// let calcTotal = d.oldTotal - d.pickQty
							// let calcCartons = Math.trunc(calcTotal/d.unit)
							// let calcBoxes = ((calcTotal/d.unit) % 1).toFixed(2) * d.unit
							// calcBoxes = parseInt(calcBoxes)
							// let calcdt = {
							// 	"calcTotal": calcTotal,
							// 	"calcCartons": calcCartons,
							// 	"calcBoxes": calcBoxes,
							// }
							// calcData.push(calcdt);
							// let calcTable = createTable(calcTitle,calcData,calcOrders)
							// cmpinfo.appendChild(calcTable);
						})

					})
				}
			})
		})
		.catch(err => {
			console.log("err:", err)
			dbtable_container.innerHTML = `<div class="alert alert-info">${err.name} : ${err.message}`;
			let alertInfo = document.querySelector("#dbtable_container div.alert-info")
			alertInfo.style.width  = "500px";
			fadeOut(alertInfo)
		})
	}
});

let closeBtn = document.querySelector(".btn-cancel");
if(closeBtn) {
	closeBtn.addEventListener('click', function() {
		let fetch_url = "https://gzhang.dev/tenda/api/txrb?rbname=CompletePickList&urlname=/tenda/picklist"
		fetch(fetch_url)
		.then(()=>{
			const modal = document.querySelector(".modal");
			modal.classList.toggle("show-modal");
		})
		.then(()=>{
			let cmpinfo = document.querySelector('#complete-info');
			cmpinfo.innerHTML = ""
		})
	})
}
let commitBtn = document.querySelector(".btn-commit");
if(commitBtn) {
	commitBtn.addEventListener('click', function() {
		let fetch_url = "https://gzhang.dev/tenda/api/txcm?cmname=CompletePickList&urlname=/tenda/picklist"
		fetch(fetch_url)
		.then(()=>{
			const modal = document.querySelector(".modal");
			modal.classList.toggle("show-modal");
		})
		.then(()=>{
			let cmpinfo = document.querySelector('#complete-info');
			cmpinfo.innerHTML = ""
		})
	})
}



