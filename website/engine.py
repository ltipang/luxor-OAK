from responses import error_400_message, error_401_message, error_403_message, success_200_message
import smtplib

def get_password(password):
    return password

def check_password(db_password, login_password):
    return db_password == login_password

from sql import get_one_record
def log_in(user_name, password):
	sql_command = 'select `password`, `role_id`, `id`, `email`, `name`  from `tbl_admin` where `email` = %s'
	num, info = get_one_record(sql_command, user_name)
	if num < 1: return error_400_message("user name")
	if not check_password(info[0], password):
		return error_400_message('password')
	return {
		"status": 'SUCCESS',
		"statusCode": '200',
		"message": 'admin' if info[1] == 1 else 'non-admin',
		"id": info[2],
		"email": info[3],
		"user_name": info[4],
	}

from sql import add_administrator
def add_admin():
	add_administrator(get_password('admin123456'))

def mail_send(user_email, subject, body):
	From = "dave@mindbox.ai"
	Password = "Javi@mindbox123"
	server = smtplib.SMTP('smtp.gmail.com', 587)
	server.ehlo()
	server.starttls()
	server.login(From, Password)
	sent_from = From
	to = [user_email]
	email_text = """\
	From: %s
	To: %s
	Subject: %s

	%s
	""" % (sent_from, ", ".join(to), subject, body)
	server.sendmail(sent_from, to, email_text)
