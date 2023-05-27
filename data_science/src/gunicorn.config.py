import multiprocessing

bind = "0.0.0.0:<%= p('port') %>"
workers = multiprocessing.cpu_count() * 2 + 1