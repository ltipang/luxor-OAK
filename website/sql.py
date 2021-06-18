import pymysql
from datetime import timezone, datetime
from common import sql_host, sql_user, sql_db

def get_db_cursor():
	db = pymysql.connect(host=sql_host, user=sql_user, db=sql_db)
	cur = db.cursor()
	return db, cur

def get_one_record(sql_command, params):
	db, cur = get_db_cursor()
	num = cur.execute(sql_command, params)
	record = cur.fetchone()
	cur.close()
	db.close()
	return num, record

def get_records(sql_command, params):
	db, cur = get_db_cursor()
	num = cur.execute(sql_command, params)
	rv = cur.fetchall()
	return rv

def get_one_data(sql_command, id):
	db, cur = get_db_cursor()
	num = cur.execute(sql_command, id)
	row_headers = [x[0] for x in cur.description]  # this will extract row headers
	record = cur.fetchone()
	json_data = []
	json_data.append(dict(zip(row_headers, record)))
	cur.close()
	db.close()
	return num, json_data

def update_record(sql_command, params):
	db, cur = get_db_cursor()
	cur.execute(sql_command, params)
	db.commit()
	cur.close()
	db.close()

def get_full_data(sql_command, row_headers=None):
	db, cur = get_db_cursor()
	num = cur.execute(sql_command)
	if row_headers is None: row_headers = [x[0] for x in cur.description]  # this will extract row headers
	rv = cur.fetchall()
	json_data = []
	for row in rv:
		result = []
		for item in row:
			if type(item) is datetime: item = item.astimezone(timezone.utc)
			result.append(item)
		json_data.append(dict(zip(row_headers, result)))
	cur.close()
	db.close()
	return json_data

def add_administrator(admin_pwd):
	db, cur = get_db_cursor()
	sql_command = 'select `name` from `users` where `admin` = 1'
	num = cur.execute(sql_command)
	if num < 1:
		sql_command = 'insert into `users` (`name`, `pwd`, `admin`) values (%s, %s, %s)'
		cur.execute(sql_command, ('admin', admin_pwd, 1))
		db.commit()
	cur.close()
	db.close()
