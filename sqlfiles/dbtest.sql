truncate table last_updated_test;
truncate table picklist_test;
truncate table stock_updated_test;

INSERT INTO last_updated_test(location,model,unit,cartons,boxes,total,completed_at)
SELECT location,model,unit,cartons,boxes,total,completed_at
FROM last_updated;

INSERT INTO picklist_test(PNO,model,qty,customer,location,status,created_at,updated_at)
SELECT PNO,model,qty,customer,location,status,created_at,updated_at
FROM picklist;

INSERT INTO stock_updated_test(location,model,unit,cartons,boxes,total,kind,notes,update_comments,updated_at)
SELECT location,model,unit,cartons,boxes,total,kind,notes,update_comments,updated_at
FROM stock_updated;
