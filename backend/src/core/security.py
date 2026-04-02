import bcrypt

def hash_password(password: str) -> str:
    pwd = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd, salt)

    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    pwd = password.encode('utf-8')
    is_valid = bcrypt.checkpw(pwd, hashed.encode('utf-8'))
    
    return is_valid