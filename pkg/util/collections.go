package util

func Partition[A any](as []A, f func(A) bool) ([]A, []A) {
	yes := make([]A, 0, len(as))
	no := make([]A, 0, len(as))

	for _, a := range as {
		if f(a) {
			yes = append(yes, a)
		} else {
			no = append(no, a)
		}
	}

	return yes, no
}
