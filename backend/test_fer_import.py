import traceback

print('Python', __import__('sys').version)
try:
    try:
        from fer import FER
    except Exception:
        from fer.fer import FER
    print('Imported fer OK:', FER)
    try:
        fd = FER(mtcnn=True)
        print('FER initialization OK:', fd)
    except Exception as e:
        print('FER initialization raised an exception:')
        traceback.print_exc()
except Exception as e:
    print('Importing fer raised an exception:')
    traceback.print_exc()
