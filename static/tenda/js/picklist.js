// fetch("https://gzhang.dev/tenda/api/picked?date=today")
// .then( resp => {
// 	return resp.json();
// })
// .then( data => {
// 	console.log(data)
// 	let tableBody = document.querySelector('#picklist_table tbody')
// 	tableBody.innerHTML = ""
// 	let tplrow = document.querySelector('#htmpl_pick');
	
// 	data.forEach(p=> {
// 		var row = tplrow.content.cloneNode(true);
// 		var td = row.querySelectorAll('td');
// 		td.item(0).textContent = p.PID;
// 		td.item(1).textContent = p.PNO;
// 		td.item(2).textContent = p.model;
// 		td.item(3).textContent = p.qty;
// 		td.item(4).textContent = p.customer;
// 		td.item(5).textContent = p.location;
// 		td.item(6).textContent = p.status;
// 		td.item(7).textContent = p.last_updated;
// 		td.item(8).innerHTML = `<a href="/tenda/update/picked?PID=${p.PID}">update</a>`;
// 		tableBody.appendChild(row);
// 	})
// })

const pickListButton = document.querySelector(".select-picklist")

pickListButton.addEventListener("click", function() {
	let pickDate = document.querySelector("#pick_date").value
	let pickStatus = document.querySelector("#pick_status").value;
	console.log("pick date is:", pickDate)
	console.log("pick status is:", pickStatus)
	let fetch_url = `https://gzhang.dev/tenda/api/picklist?date=${pickDate}&status=${pickStatus}`
	console.log("fetch_url:", fetch_url)
	fetch(fetch_url)
	.then( resp => {
		return resp.json();
	})
	.then( data => {
		console.log(data)
		let table = document.querySelector('table')
		let thead = document.createElement("thead")
		console.log("data[0]", data[0]);
		if (!data[0]) {
			table.innerHTML = ""
			return
		}
		if(data[0].PID) {
			let tbheads = document.querySelector('#tmp_tbhead');
			let theadrow = tbheads.content.cloneNode(true);
			var ths = theadrow.querySelectorAll('th');
			ths.item(0).textContent = "PID";
			ths.item(1).textContent = "PNO";
			ths.item(2).textContent = "model";
			ths.item(3).textContent = "qty";
			ths.item(4).textContent = "customer";
			ths.item(5).textContent = "location";
			ths.item(6).textContent = "status";
			ths.item(7).textContent = "created_at";
			ths.item(8).textContent = "updated_at";
			ths.item(9).textContent = "Action";
			thead.appendChild(theadrow);
			table.appendChild(thead);
			return data
		}
		if(data[0].LID) {
			// let tbrows = document.querySelector('#tmp_tbrow');
			// let tbcells = tbrows.content.cloneNode(true);
			// var tds = tbcells.querySelectorAll('td');
			// data.forEach(p=> {
			// 	var row = tplrow.content.cloneNode(true);
			// 	var td = row.querySelectorAll('td');
			// 	td.item(0).textContent = p.PID;
			// 	td.item(1).textContent = p.PNO;
			// 	td.item(2).textContent = p.model;
			// 	td.item(3).textContent = p.qty;
			// 	td.item(4).textContent = p.customer;
			// 	td.item(5).textContent = p.location;
			// 	td.item(6).textContent = p.status;
			// 	td.item(7).textContent = p.created_at;
			// 	td.item(8).textContent = p.updated_at;
			// 	td.item(9).innerHTML = `<a href="/tenda/update/picklist?PID=${p.PID}">update</a>`;
			// 	tableBody.appendChild(row);
			// })
		}
		
	})
	.then( data=> {
		if(data[0].PID) {
			let table = document.querySelector('table')
			let tbody = document.createElement('tbody')
			let tbrows = document.querySelector('#tmp_tbrow');
			let tbcells = tbrows.content.cloneNode(true);
			var tds = tbcells.querySelectorAll('td');
			data.forEach(p=> {
				var row = tbrows.content.cloneNode(true);
				var td = row.querySelectorAll('td');
				td.item(0).textContent = p.PID;
				td.item(1).textContent = p.PNO;
				td.item(2).textContent = p.model;
				td.item(3).textContent = p.qty;
				td.item(4).textContent = p.customer;
				td.item(5).textContent = p.location;
				td.item(6).textContent = p.status;
				td.item(7).textContent = p.created_at;
				td.item(8).textContent = p.updated_at;
				td.item(9).innerHTML = `<a href="/tenda/update/picklist?PID=${p.PID}">update</a>`;
				tbody.appendChild(row);
				table.appendChild(tbody)
			})
		}
	})
})

const completePickBtn = document.querySelector('#completeBtn')
completePickBtn.addEventListener('click', function() {
	let formData = new FormData();
	let data = new URLSearchParams(formData);
	let pickStatus = document.querySelector('#pick_status').value
	let pickDate   = document.querySelector("#pick_date").value
	console.log("pick status to Complete:", pickStatus);
	console.log("pick date to complete", pickDate);
	data.append("pickDate", pickDate)
	data.append("pickStatus", pickStatus)
	let tableBody = document.querySelector('#picklist_table tbody')
	let trows = tableBody.querySelectorAll('tr');
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
		})
	}
})