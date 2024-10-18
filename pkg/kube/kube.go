package kube

import (
	"sync"
)

type Kubes struct {
	lock        sync.RWMutex
	ctxClusters map[string]*KubeCluster
}

func MakeKube() *Kubes {
	return &Kubes{
		ctxClusters: map[string]*KubeCluster{},
	}
}

func (k *Kubes) GetOrMakeKubeCluster(kubeCtxName string) (*KubeCluster, error) {
	k.lock.Lock()
	defer k.lock.Unlock()

	kc, found := k.ctxClusters[kubeCtxName]
	if !found {
		var err error
		kc, err = NewKubeCluster(kubeCtxName)
		if err != nil {
			return nil, err
		}
		k.ctxClusters[kc.name] = kc
	}

	return kc, nil
}
