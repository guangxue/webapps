package tenda

import (
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"encoding/json"
	"github.com/guangxue/webapps/mysql"
)

func PickListComplete (w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		err := r.ParseForm()
		if err != nil {
			fmt.Printf("[%-18s] Form parse error:\n", "CompletePickList", err)
		}
		/* {pickDate}   - POST request from Ajax
		/* {pickStatus} - POST request from Ajax
		/* +--------------------------------------------------+ */
		/* | 1. Parse POST form data {pickDate}, {pickStatus} | */
		/* +--------------------------------------------------+ */
		pickDate := r.FormValue("pickDate")
		pickStatus := r.FormValue("pickStatus")
		lastSaturday := r.FormValue("lastSaturday")

		fmt.Printf("[%-18s] =========== PickListComplete.go  ===========\n", "==================")
		fmt.Printf("[%-18s] Pick date   :%v\n", "",pickDate)
		fmt.Printf("[%-18s] pick status :%v\n", "",pickStatus)
		fmt.Printf("[%-18s] pick lastSaturday :%v\n", "",lastSaturday)


		p := pickcolumns{}
		allPicks := []pickcolumns{}

		/* if {pickDate} is empty, no db action needed. */
		// if pickStatus == "Updated"  || pickDate == "" {
			
		// 	fmt.Printf("[%-18s] *Stmt Err*: Invalid update statement for complete orders, want {pickStatus} and {pickDate}.\n", "CompletePickList")
		// 	fmt.Printf("[%-18s] *Stmt Err*: Want {pickStatus} and {pickDate} to complete.\n", "CompletePickList")
		// 	stmtErr := map[string]string{
		// 		"stmtErr": "Need {pickStatus} and {pickDate} to complete picklist",
		// 	}
		// 	stmtErrors := []map[string]string{}
		// 	stmtErrors = append(stmtErrors, stmtErr)
		// 	returnJson(w, stmtErrors)
		// 	return
		// }
		/* +---------------------------------------------------------------------------------------+ */
		/* | 2. SELECT All Pending Orders
		/* |    FROM `picklist` 
		/* |    According {pickDate} and {pickStatus} which from POST data.
		/* +---------------------------------------------------------------------------------------+ */
		/* {p}   - Scaned single row */
		/* {allPicks} - array of {p}  */

		stmt := fmt.Sprintf("SELECT PID, model, qty, location FROM %s WHERE created_at LIKE %q AND status =%q", tbname["picklist"], pickDate+"%", pickStatus)
		fmt.Printf("[%-18s] %s\n", " --- SELECT ---", stmt)
		// sqlstmt
		//    "SELECT PID, model, qty, location
		//     FROM picklist
		//     WHERE created_at LIKE '"+pickDate+"%' AND status ='"+pickStatus+"'"

		tx, ctx := mysql.Begin(db)

		rows, err := tx.QueryContext(ctx, stmt)
		if err != nil {
			fmt.Printf("[%-18s] *SELECT Err*:%v\n", "CompletePickList", err)
		}

		for rows.Next() {
			err := rows.Scan(&p.PID, &p.Model, &p.Qty, &p.Location)
			if err != nil {
				fmt.Printf("[%-18s]: dbColumns Scan error:%v\n", "CompletePickList",err)
			}
			allPicks = append(allPicks, p)
		}
		
		/* +----------------------------------------------------------+ */
		/* | 3. Start calculate {cartons}, {boxes}, {total} to UPDATE   */
		/* +----------------------------------------------------------+ */
		completeInfos := []map[string]string{}
		upModels := []updateModel{}
		for i, p := range allPicks {
			fmt.Printf("[------------------------------  Pending Order[%d] --------------\n", i)
			fmt.Printf("[%-18s] %s\n", "    Model:",p.Model)
			fmt.Printf("[%-18s] %s\n", "    Location:",p.Location)
			
			completeInfo := map[string]string{}
			completeInfo["model"] = p.Model
			completeInfo["location"] = p.Location
			unit := 0
			oldCartons := 0
			oldBoxes := 0
			oldTotals := 0
			/* +-------------------------------------------------------+ */
			/* | 4.0 Get {total}, {unit} from `stock_updated`            */
			/* +-------------------------------------------------------+ */
			stmt := fmt.Sprintf("SELECT unit, cartons, boxes, total FROM %s WHERE model=? AND location=?", tbname["stock_updated"])
			err := tx.QueryRowContext(ctx,stmt, p.Model, p.Location).Scan(&unit, &oldCartons, &oldBoxes, &oldTotals)
			switch {
				case err == sql.ErrNoRows:
					fmt.Printf("[db *ERR*] no `oldTotals` for model %s\n", p.Model)
				case err != nil:
					fmt.Printf("[db *ERR*] query error: %v\n", err)
				default:
					fmt.Printf("[%-18s] %d\n", "    oldTotals:",oldTotals)
			}

			// {p.Qty}: quantity picked
			fmt.Printf("[%-18s] %d\n", "    pick qty:",p.Qty)
			completeInfo["pickQty"]= strconv.Itoa(p.Qty)

			newTotal := oldTotals - p.Qty
			fmt.Printf("[%-18s] %d\n", " *NEW*   Total:",newTotal)
			fmt.Printf("[%-18s] %d\n", " *unit*  are:",unit)
			completeInfo["oldTotal"]= strconv.Itoa(oldTotals)
			completeInfo["unit"] = strconv.Itoa(unit)

			/* 4.1 if unit = 0, then {newCartons} = {newBox} */
			newCartons := 0
			newBoxes   := newTotal

			/* 4.2 {newTotal}  : {total} - {p.Qty} */
			/* 4.3 {newCartons}: {newCartons}/{unit} */
			/* 4.4 {newBoxes}  : ({newCartons}/{unit} - {newCartons} )*{unit} */
			if unit > 1 {
				newCartons = newTotal/unit
				fmt.Printf("[%-18s] %d\n", " *NEW*   Cartons:",newCartons)
				newBoxesFrac := float64(newTotal)/float64(unit) - float64(newCartons)
				fmt.Printf("[%-18s] %f\n", " *NEW*   BoxeFrac:",newBoxesFrac)
				newBoxesFrac = newBoxesFrac * float64(unit)
				newBoxes = int(math.Round(newBoxesFrac))
				fmt.Printf("[%-18s] %d\n", " *NEW*   Boxes:",newBoxes)
			} 
			
			upModel := updateModel{p.Location, p.Model, unit, newCartons, newBoxes, newTotal}
			upModels = append(upModels, upModel)

			/* +----------------------------------------+
			/* | 5. Update `stock_update` table first
			/* +----------------------------------------+ */
			completeInfo["newCartons"] = strconv.Itoa(newCartons)
			completeInfo["newBoxes"] = strconv.Itoa(newBoxes)
			completeInfo["newTotal"] = strconv.Itoa(newTotal)
			updateStockUpdate := map[string]interface{} {
				"cartons": newCartons,
				"boxes"  : newBoxes,
				"total"  : newTotal,
			}
			mysql.
				Update(tbname["stock_updated"],false).
				Set(updateStockUpdate).
				Where("model", p.Model).
				AndWhere("location", "=",p.Location).
			With(tx,ctx)

			/* +--------------------------------------------------+ */
			/* | 6. Update `picklist` table status to 'Complete'  | */
			/* +--------------------------------------------------+ */
			pickListSet := map[string]interface{} {"status":"Complete"}
			mysql.
				Update(tbname["picklist"], false).
				Set(pickListSet).
				Where("PID", strconv.Itoa(p.PID)).
			With(tx,ctx)

			/* +--------------------------------------------------------------------------------+ */
			/* 7. Check if model (that is completed) already exists in the table `last_updated`
			/* 7.1 IF EXISTS, UPDATE it,
			/* 7.2 Otherwise, INSERT: new data
			/* +--------------------------------------------------------------------------------+ */
			lid := 0
			total_picks := 0
			stmt = fmt.Sprintf("SELECT LID,total_picks FROM %s WHERE model=? AND location=? AND completed_at > ?", tbname["last_updated"])
			Checkerr := tx.QueryRowContext(ctx,stmt, p.Model, p.Location, lastSaturday).Scan(&lid, &total_picks)
			switch {
				case Checkerr == sql.ErrNoRows:
					fmt.Printf("[%-18s] NO ROWS return from last_updated for `%s`, then INSERT\n", "  *db Rows*", p.Model)
					completeInfo["sqlinfo"] = "INSERT into last_updated"
					insertValues := map[string]interface{} {
						"location"   : p.Location,
						"model"      : p.Model,
						"old_total"  : oldTotals,
						"total_picks": p.Qty,
						"unit"       : unit,
						"cartons"    : newCartons,
						"boxes"      : newBoxes,
						"total"      : newTotal,
						"completed_at": TimeNow(),
					}
					insertId := mysql.InsertInto(tbname["last_updated"],insertValues).With(tx, ctx)
					fmt.Printf("[%-18s] %s\n", " last Insert ID", insertId[0]["lastId"])
					completeInfo["ID"] = insertId[0]["lastId"]
				case Checkerr != nil:
					fmt.Printf("[db *ERR*] query error: %v\n", err)
				case lid > 0:
					fmt.Printf("[%-18s] FOUND `model id`:%d , then UPDATE\n", "  *db Rows*", lid)
					completeInfo["sqlinfo"] = "UPDATE last_update"
					//mid := strconv.Itoa(lid)
					for i, v := range completeInfos {
						fmt.Printf("\t[%d] : %v\n", i, v)
					}
					allpicks := p.Qty + total_picks
					updateValues := map[string]interface{} {
						"location"    : p.Location,
						"model"       : p.Model,
						"total_picks" : allpicks,
						"unit"        : unit,
						"cartons"     : newCartons,
						"boxes"       : newBoxes,
						"total"       : newTotal,
						"completed_at": TimeNow(),
					}
					mysql.
						Update(tbname["last_updated"], false).
						Set(updateValues).
						Where("model", p.Model).
						AndWhere("location", "=",p.Location).
						AndWhere("completed_at", ">", lastSaturday).
					With(tx, ctx)
			}
			
			// for i, completeInfo := range completeInfos {
			// 	fmt.Printf("CompleteInfo[%d]:\n", i)
			// 	for key, val := range completeInfo {
			// 		fmt.Printf("\t%s=%s\n",key, val)
			// 	}
			// }
			completeInfos = append(completeInfos, completeInfo)
		}
		// END for-loop
		dbCommits["CompletePickList"] = tx
		json.NewEncoder(w).Encode(completeInfos)
	}
}